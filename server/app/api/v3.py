import logging
import re
from functools import wraps
from http import HTTPStatus
from urllib.parse import unquote
import json
import numpy as np
import time
import uuid
from datetime import datetime, timezone

from flask import (
    Blueprint,
    current_app,
    escape,
    make_response,
    redirect,
    request,
    send_from_directory,
)
from flask_restful import Api, Resource

import server.common.agent as common_agent
import server.common.rest as common_rest
from server.app.api.util import get_data_adaptor, get_dataset_artifact_s3_uri
from server.common.constants import CELLGUIDE_CXG_KEY_NAME, CUSTOM_CXG_KEY_NAME
from server.common.errors import (
    DatasetAccessError,
    DatasetMetadataError,
    DatasetNotFoundError,
    TombstoneError,
)
from server.common.utils.http_cache import ONE_YEAR, cache_control

# In-memory workflow store (in production this would be database-backed)
WORKFLOW_STORE = {}


def rest_get_s3uri_data_adaptor(func):
    @wraps(func)
    def wrapped_function(self, s3_uri=None):
        try:
            s3_uri = unquote(s3_uri) if s3_uri else s3_uri
            data_adaptor = get_data_adaptor(s3_uri)
            return func(self, data_adaptor)
        except (DatasetAccessError, DatasetNotFoundError, DatasetMetadataError) as e:
            return common_rest.abort_and_log(
                e.status_code, f"Invalid s3_uri {s3_uri}: {e.message}", loglevel=logging.INFO, include_exc_info=True
            )

    return wrapped_function


class DatasetResource(Resource):
    """Base class for all Resources that act on datasets."""

    def __init__(self, url_dataroot):
        super().__init__()
        self.url_dataroot = url_dataroot


class S3URIAPI(DatasetResource):
    @cache_control(public=True, no_store=True, max_age=0)
    def get(self, dataset):
        app_config = current_app.app_config
        return common_rest.s3_uri_get(app_config, self.url_dataroot, dataset)


class S3URIResource(Resource):
    """Base class for all Resources that act on S3 URIs."""

    def __init__(self, s3_uri_root):
        super().__init__()
        self.s3_uri_root = s3_uri_root


class SchemaAPI(S3URIResource):
    # TODO @mdunitz separate dataset schema and user schema
    # TODO: Add user-specific caching using ETags - schema can be cached per-user
    #       since user annotations only affect individual users. Consider:
    #       - ETag based on hash(base_schema + user_annotations_for_user)
    #       - Anonymous users get ETag based only on base_schema
    #       - This would allow long-term caching for read-only users while
    #         still supporting fresh data for annotation creators
    # Removed immutable cache since schema can change with user annotations
    @cache_control(no_store=True, max_age=0)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.schema_get(data_adaptor)


class GenesetsAPI(S3URIResource):
    @cache_control(no_store=True, max_age=0)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.genesets_get(data_adaptor)

    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def put(self, data_adaptor):
        return common_rest.genesets_put(request, data_adaptor)


class ConfigAPI(S3URIResource):
    @cache_control(immutable=True, max_age=ONE_YEAR)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.config_get(current_app.app_config, data_adaptor)


class AnnotationsObsAPI(S3URIResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        # Check if request includes user annotations to determine caching
        fields = request.args.getlist("annotation-name", None)
        user_id = common_rest._resolve_request_user_id(request)

        # Check if any requested fields are user annotations (writable=True in schema)
        includes_user_annotations = False
        if user_id:
            try:
                # Get schema with user annotations included
                schema = data_adaptor.get_schema(user_id=user_id)
                obs_columns = schema.get("annotations", {}).get("obs", {}).get("columns", [])

                # Find all user annotation names (writable=True)
                user_annotation_names = {
                    col["name"] for col in obs_columns if isinstance(col, dict) and col.get("writable", False)
                }

                if fields:
                    # Check if any requested fields are user annotations
                    includes_user_annotations = bool(set(fields) & user_annotation_names)
                else:
                    # If no specific fields requested (getting all), and user has annotations
                    includes_user_annotations = bool(user_annotation_names)
            except Exception:
                # If we can't determine, be safe and don't cache
                includes_user_annotations = True

        response = common_rest.annotations_obs_get(request, data_adaptor)

        # Apply appropriate cache headers
        if includes_user_annotations:
            # Don't cache responses that include user annotations
            response.headers["Cache-Control"] = "no-store, max-age=0"
        else:
            # Cache built-in columns forever
            response.headers["Cache-Control"] = f"immutable, max-age={ONE_YEAR}"

        return response

    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def put(self, data_adaptor):
        # Check if this is a category rename operation
        if request.args.get("rename"):
            return common_rest.annotations_obs_category_rename(request, data_adaptor)
        else:
            return common_rest.annotations_obs_put(request, data_adaptor)

    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def delete(self, data_adaptor):
        return common_rest.annotations_obs_category_delete(request, data_adaptor)


class AnnotationsVarAPI(S3URIResource):
    @cache_control(immutable=True, max_age=ONE_YEAR)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.annotations_var_get(request, data_adaptor)


class DataVarAPI(S3URIResource):
    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def put(self, data_adaptor):
        return common_rest.data_var_put(request, data_adaptor)

    @cache_control(immutable=True, max_age=ONE_YEAR)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.data_var_get(request, data_adaptor)


class ColorsAPI(S3URIResource):
    @cache_control(immutable=True, max_age=ONE_YEAR)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.colors_get(data_adaptor)


class DiffExpObsAPI(DatasetResource):
    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def post(self, data_adaptor):
        return common_rest.diffexp_obs_post(request, data_adaptor)


class DiffExpObs2API(DatasetResource):
    @cache_control(no_store=True)
    @rest_get_s3uri_data_adaptor
    def post(self, data_adaptor):
        return common_rest.diffex_binary_post(request, data_adaptor)


class LayoutObsAPI(S3URIResource):
    @cache_control(immutable=True, max_age=ONE_YEAR)
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.layout_obs_get(request, data_adaptor)


class SummarizeVarAPI(S3URIResource):
    @rest_get_s3uri_data_adaptor
    @cache_control(immutable=True, max_age=ONE_YEAR)
    def get(self, data_adaptor):
        return common_rest.summarize_var_get(request, data_adaptor)

    @rest_get_s3uri_data_adaptor
    @cache_control(no_store=True)
    def post(self, data_adaptor):
        return common_rest.summarize_var_post(request, data_adaptor)


class GeneInfoAPI(S3URIResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.gene_info_get(request)


class CellTypeInfoAPI(S3URIResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.cell_type_info_get(request)


class CellTypeListAPI(S3URIResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.cell_type_list_get(request)


class VersionAPI(Resource):
    def get(self):
        return common_rest.get_deployed_version(request)


class UnsMetaAPI(DatasetResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.uns_metadata_get(request, data_adaptor)


class ATACCoverageAPI(DatasetResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.atac_coverage_get(request, data_adaptor)


# class ATACGeneInfoAPI(DatasetResource):
#     @rest_get_s3uri_data_adaptor
#     def get(self, data_adaptor):
#         return common_rest.atac_gene_info_get(request, data_adaptor)


class ATACCytobandAPI(DatasetResource):
    @rest_get_s3uri_data_adaptor
    def get(self, data_adaptor):
        return common_rest.atac_cytoband_get(request, data_adaptor)


class AgentAPI(S3URIResource):  # Inherit from S3URIResource instead of Resource
    @rest_get_s3uri_data_adaptor
    def post(self, data_adaptor):
        return common_agent.agent_step_post(request, data_adaptor)


class ReembedAPI(S3URIResource):
    """Stubbed reembedding API that generates random embeddings"""
    
    @rest_get_s3uri_data_adaptor
    def put(self, data_adaptor):
        """Generate a random embedding for the selected cells"""
        try:
            args = request.get_json() or {}
            filter_params = args.get("filter", {})
            obs_filter = filter_params.get("obs", {})
            cell_indices = obs_filter.get("index", [])
            params = args.get("params", {})
            parent_name = args.get("parentName", "")
            emb_name = args.get("embName", "random_embedding")
            
            # Simulate processing time
            time.sleep(1)
            
            # Generate random 2D embedding
            n_cells = len(cell_indices) if cell_indices else 1000
            
            # Create random embedding with some structure (spiral pattern)
            t = np.linspace(0, 4*np.pi, n_cells)
            noise = np.random.normal(0, 0.1, size=(n_cells, 2))
            
            # Create spiral pattern with noise
            spiral_radius = np.linspace(0.1, 2, n_cells)
            x = spiral_radius * np.cos(t) + noise[:, 0]
            y = spiral_radius * np.sin(t) + noise[:, 1]
            
            # Create embedding data in the format expected by the frontend
            embedding_data = {
                "schema": {
                    "dataframe": {
                        "nObs": n_cells,
                        "nVar": data_adaptor.get_shape()[1],  # Keep original var count
                        "nEmb": {
                            emb_name: [0, 1]  # 2D embedding
                        }
                    }
                },
                "embedding": {
                    emb_name: {
                        "coordinates": np.column_stack([x, y]).tolist(),
                        "dims": ["x", "y"]
                    }
                }
            }
            
            # Create mock layout schema response
            layout_schema = {
                "name": emb_name,
                "type": "embedding",
                "dims": 2,
                "coordinates": embedding_data["embedding"][emb_name]["coordinates"]
            }
            
            response_data = {
                "layoutSchema": layout_schema,
                "schema": embedding_data["schema"]
            }
            
            return make_response(
                json.dumps(response_data),
                HTTPStatus.OK,
                {"Content-Type": "application/json"}
            )
            
        except Exception as e:
            logging.error(f"Error in reembedding: {str(e)}")
            return common_rest.abort_and_log(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                f"Reembedding failed: {str(e)}",
                include_exc_info=True
            )


class PreprocessAPI(S3URIResource):
    """Stubbed preprocessing API"""
    
    @rest_get_s3uri_data_adaptor
    def put(self, data_adaptor):
        """Simulate preprocessing of data"""
        try:
            args = request.get_json() or {}
            filter_params = args.get("filter", {})
            obs_filter = filter_params.get("obs", {})
            cell_indices = obs_filter.get("index", [])
            params = args.get("params", {})
            
            # Simulate processing time
            time.sleep(0.5)
            
            # Return current schema (preprocessing doesn't change schema structure)
            n_cells = len(cell_indices) if cell_indices else data_adaptor.get_shape()[0]
            n_vars = data_adaptor.get_shape()[1]
            
            schema_data = {
                "schema": {
                    "dataframe": {
                        "nObs": n_cells,
                        "nVar": n_vars,
                    }
                }
            }
            
            return make_response(
                json.dumps(schema_data),
                HTTPStatus.OK,
                {"Content-Type": "application/json"}
            )
            
        except Exception as e:
            logging.error(f"Error in preprocessing: {str(e)}")
            return common_rest.abort_and_log(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                f"Preprocessing failed: {str(e)}",
                include_exc_info=True
            )


class WorkflowSubmissionAPI(S3URIResource):
    """Stubbed workflow submission API (proxies Argo Workflows)"""
    
    @rest_get_s3uri_data_adaptor
    def post(self, data_adaptor):
        """Submit a reembedding or preprocessing workflow"""
        try:
            args = request.get_json() or {}
            workflow_type = args.get("workflowType", "reembedding")
            parameters = args.get("parameters", {})
            metadata = args.get("metadata", {})
            
            # Generate unique workflow ID
            workflow_id = str(uuid.uuid4())
            created_at = datetime.now(timezone.utc).isoformat()
            
            # Create workflow entry in store
            workflow_data = {
                "workflowId": workflow_id,
                "workflowType": workflow_type,
                "parameters": parameters,
                "metadata": metadata,
                "createdAt": created_at,
                "status": {
                    "phase": "Pending",
                    "startedAt": None,
                    "finishedAt": None,
                    "progress": {
                        "current": 0,
                        "total": 100,
                        "percentage": 0
                    },
                    "message": "Workflow submitted and queued for execution",
                    "nodes": {}
                },
                "result": None
            }
            
            WORKFLOW_STORE[workflow_id] = workflow_data
            
            # Estimate duration based on workflow type and data size
            cell_count = len(parameters.get("filter", {}).get("obs", {}).get("index", []))
            if workflow_type == "reembedding":
                estimated_duration = 0.1  # 5 seconds for testing
            else:
                estimated_duration = 0.05  # 2.5 seconds for preprocessing
            
            response_data = {
                "workflowId": workflow_id,
                "status": workflow_data["status"],
                "createdAt": created_at,
                "estimatedDurationMinutes": estimated_duration
            }
            
            logging.info(f"Submitted {workflow_type} workflow {workflow_id} for {cell_count} cells")
            
            return make_response(
                json.dumps(response_data),
                HTTPStatus.CREATED,
                {"Content-Type": "application/json"}
            )
            
        except Exception as e:
            logging.error(f"Error submitting workflow: {str(e)}")
            return common_rest.abort_and_log(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                f"Workflow submission failed: {str(e)}",
                include_exc_info=True
            )


class WorkflowStatusAPI(S3URIResource):
    """Stubbed workflow status API (polls Argo Workflows status)"""
    
    @rest_get_s3uri_data_adaptor  
    def get(self, data_adaptor):
        """Get workflow status by ID"""
        try:
            workflow_id = request.args.get("workflow_id")
            if not workflow_id:
                return common_rest.abort_and_log(
                    HTTPStatus.BAD_REQUEST,
                    "workflow_id parameter is required"
                )
            
            if workflow_id not in WORKFLOW_STORE:
                return common_rest.abort_and_log(
                    HTTPStatus.NOT_FOUND,
                    f"Workflow {workflow_id} not found"
                )
            
            workflow_data = WORKFLOW_STORE[workflow_id]
            
            # Simulate workflow progress
            current_time = datetime.now(timezone.utc)
            created_time = datetime.fromisoformat(workflow_data["createdAt"].replace('Z', '+00:00'))
            elapsed_seconds = (current_time - created_time).total_seconds()
            
            # Update workflow status based on elapsed time
            if workflow_data["status"]["phase"] == "Pending" and elapsed_seconds > 5:
                # Start running after 5 seconds
                workflow_data["status"]["phase"] = "Running"
                workflow_data["status"]["startedAt"] = current_time.isoformat()
                workflow_data["status"]["message"] = "Workflow is running..."
                workflow_data["status"]["progress"]["current"] = 10
                workflow_data["status"]["progress"]["percentage"] = 10
                
            elif workflow_data["status"]["phase"] == "Running":
                # Simulate progress over time - complete after 5 seconds total
                if elapsed_seconds < 5:
                    # Progress from 10% to 100% over 5 seconds
                    progress = 10 + int((elapsed_seconds / 5) * 90)
                    workflow_data["status"]["progress"]["current"] = progress
                    workflow_data["status"]["progress"]["percentage"] = progress
                    if elapsed_seconds < 2.5:
                        workflow_data["status"]["message"] = "Preprocessing data..."
                    else:
                        workflow_data["status"]["message"] = "Computing embedding..."
                else:
                    # Complete after 5 seconds
                    workflow_data["status"]["phase"] = "Succeeded"
                    workflow_data["status"]["finishedAt"] = current_time.isoformat()
                    workflow_data["status"]["progress"]["current"] = 100
                    workflow_data["status"]["progress"]["percentage"] = 100
                    workflow_data["status"]["message"] = "Workflow completed successfully"
                    
                    # Generate result for reembedding workflows
                    if workflow_data["workflowType"] == "reembedding":
                        # Generate random embedding like the old endpoint
                        cell_indices = workflow_data["parameters"]["filter"]["obs"]["index"]
                        n_cells = len(cell_indices)
                        emb_name = workflow_data["parameters"].get("embName", "workflow_embedding")
                        
                        # Create spiral pattern embedding
                        t = np.linspace(0, 4*np.pi, n_cells)
                        noise = np.random.normal(0, 0.1, size=(n_cells, 2))
                        spiral_radius = np.linspace(0.1, 2, n_cells)
                        x = spiral_radius * np.cos(t) + noise[:, 0]
                        y = spiral_radius * np.sin(t) + noise[:, 1]
                        coordinates = np.column_stack([x, y])
                        
                        workflow_data["result"] = {
                            "layoutSchema": {
                                "name": emb_name,
                                "type": "embedding", 
                                "dims": 2,
                                "coordinates": coordinates.tolist()
                            },
                            "schema": {
                                "dataframe": {
                                    "nObs": n_cells,
                                    "nVar": data_adaptor.get_shape()[1],
                                    "nEmb": {
                                        emb_name: [0, 1]
                                    }
                                }
                            }
                        }
                        
                        # TEMPORARY STUB: Write embedding to TileDB
                        # TODO: Remove this once Argo workflows handle the write path
                        # The Argo workflow will write directly to user-data/{userId}/{dataset}/emb/
                        try:
                            from server.common.rest import _resolve_request_user_id
                            user_id = _resolve_request_user_id(request)
                            # Use default user_id when auth is disabled (for testing)
                            if not user_id:
                                user_id = "test-user"
                                logging.info(f"Using default user_id for testing: {user_id}")
                            
                            user_root_uri = data_adaptor._user_root_uri(user_id)
                            data_adaptor.write_user_embedding(
                                user_root_uri=user_root_uri,
                                embedding_name=emb_name,
                                coordinates=coordinates.astype(np.float32)
                            )
                            logging.info(f"TEMPORARY STUB: Wrote embedding {emb_name} to user-data for user {user_id}")
                        except Exception as e:
                            logging.error(f"TEMPORARY STUB: Failed to write embedding {emb_name}: {e}")
                            # Don't fail the workflow if write fails - this is just for testing
            
            response_data = {
                "workflowId": workflow_id,
                "status": workflow_data["status"],
                "createdAt": workflow_data["createdAt"],
                "updatedAt": current_time.isoformat(),
                "result": workflow_data.get("result")
            }
            
            return make_response(
                json.dumps(response_data),
                HTTPStatus.OK,
                {"Content-Type": "application/json"}
            )
            
        except Exception as e:
            logging.error(f"Error getting workflow status: {str(e)}")
            return common_rest.abort_and_log(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                f"Failed to get workflow status: {str(e)}",
                include_exc_info=True
            )


def rest_get_dataset_explorer_location_data_adaptor(func):
    @wraps(func)
    def wrapped_function(self, dataset=None):
        try:
            s3_uri = get_dataset_artifact_s3_uri(self.url_dataroot, dataset)
            data_adaptor = get_data_adaptor(s3_uri)
            # HACK: Used *only* to pass the dataset_explorer_location to DatasetMeta.get_dataset_and_collection_
            # metadata()
            data_adaptor.dataset_id = dataset
            return func(self, data_adaptor)
        except (DatasetAccessError, DatasetNotFoundError, DatasetMetadataError) as e:
            return common_rest.abort_and_log(
                e.status_code, f"Invalid s3_uri {dataset}: {e.message}", loglevel=logging.INFO, include_exc_info=True
            )
        except TombstoneError as e:
            parent_collection_url = (
                f"{current_app.app_config.server__app__web_base_url}/collections/{e.collection_id}"  # noqa E501
            )
            return redirect(f"{parent_collection_url}?tombstoned_dataset_id={e.dataset_id}")

    return wrapped_function


class DatasetMetadataAPI(DatasetResource):
    @cache_control(public=True, no_store=True, max_age=0)
    @rest_get_dataset_explorer_location_data_adaptor
    def get(self, data_adaptor):
        return common_rest.dataset_metadata_get(current_app.app_config, self.url_dataroot, data_adaptor.dataset_id)


def get_api_dataroot_resources(bp_dataroot, url_dataroot=None):
    """Add resources that refer to a dataset"""
    api = Api(bp_dataroot)

    def add_resource(resource, url):
        """convenience function to make the outer function less verbose"""
        api.add_resource(resource, url, resource_class_args=(url_dataroot,))

    # Initialization routes
    add_resource(S3URIAPI, "/s3_uri")
    add_resource(DatasetMetadataAPI, "/dataset-metadata")
    return api


def get_api_s3uri_resources(bp_dataroot, s3uri_path):
    """Add resources that refer to a S3 URIs"""
    api = Api(bp_dataroot)

    def add_resource(resource, url):
        """convenience function to make the outer function less verbose"""
        api.add_resource(resource, url, resource_class_args=(s3uri_path,))

    # Initialization routes
    add_resource(SchemaAPI, "/schema")
    add_resource(ConfigAPI, "/config")
    add_resource(GenesetsAPI, "/genesets")
    # Data routes
    add_resource(AnnotationsObsAPI, "/annotations/obs")
    add_resource(AnnotationsVarAPI, "/annotations/var")
    add_resource(DataVarAPI, "/data/var")
    add_resource(CellTypeInfoAPI, "/cellinfo")
    add_resource(CellTypeListAPI, "/celltypes")
    add_resource(GeneInfoAPI, "/geneinfo")
    add_resource(SummarizeVarAPI, "/summarize/var")
    # Display routes
    add_resource(ColorsAPI, "/colors")
    # Computation routes
    add_resource(DiffExpObsAPI, "/diffexp/obs")
    add_resource(DiffExpObs2API, "/diffexp/obs2")
    add_resource(LayoutObsAPI, "/layout/obs")
    # Reembedding routes (stubbed)
    add_resource(ReembedAPI, "/reembed")
    add_resource(PreprocessAPI, "/preprocess")
    # Workflow routes (async workflow submission and polling)
    add_resource(WorkflowSubmissionAPI, "/workflows/submit")
    add_resource(WorkflowStatusAPI, "/workflows/status")
    # Uns/Spatial
    add_resource(UnsMetaAPI, "/uns/meta")
    # ATAC
    add_resource(ATACCoverageAPI, "/atac/coverage")
    # add_resource(ATACGeneInfoAPI, "/atac/geneinfo")
    add_resource(ATACCytobandAPI, "/atac/cytoband")
    # Agent
    add_resource(AgentAPI, "/agent/step")
    return api


def register_api_v3(app, app_config, api_url_prefix):
    api_version = "/api/v0.3"

    s3uri_api_path = "s3_uri"
    bp_s3uri = Blueprint(
        f"api_dataset_{s3uri_api_path}_{api_version.replace('.',',')}",
        __name__,
        url_prefix=(f"{api_url_prefix}/{s3uri_api_path}/<s3_uri>" + api_version).replace("//", "/"),
    )
    s3uri_resources = get_api_s3uri_resources(bp_s3uri, s3uri_api_path)
    app.register_blueprint(s3uri_resources.blueprint)

    Api(app).add_resource(VersionAPI, "/deployed_version")

    for dataroot_dict in app_config.server__multi_dataset__dataroots.values():
        url_dataroot = dataroot_dict["base_url"]

        # Regular datasets
        bp_dataroot = Blueprint(
            name=f"api_dataset_{url_dataroot}_{api_version.replace('.',',')}",
            import_name=__name__,
            url_prefix=(f"{api_url_prefix}/{url_dataroot}/<string:dataset>" + api_version).replace("//", "/"),
        )
        dataroot_resources = get_api_dataroot_resources(bp_dataroot, url_dataroot)
        app.register_blueprint(dataroot_resources.blueprint)

        # Cellguide CXGs
        bp_dataroot_cg = Blueprint(
            name=f"api_dataset_{url_dataroot}_cellguide_cxgs_{api_version.replace('.',',')}",
            import_name=__name__,
            url_prefix=(
                f"{api_url_prefix}/{url_dataroot}/{CELLGUIDE_CXG_KEY_NAME}/<path:dataset>.cxg" + api_version
            ).replace("//", "/"),
        )
        dataroot_resources_cg = get_api_dataroot_resources(bp_dataroot_cg, url_dataroot)
        app.register_blueprint(dataroot_resources_cg.blueprint)

        # Custom CXGs (only for "w" dataroot)
        if url_dataroot == "w":
            # Add authorization check before processing any /w/ requests
            @app.before_request
            def _check_w_dataroot_access(dataroot=url_dataroot):
                # Check both direct /w/ paths and /s3_uri/ paths that contain /w/
                url_path = request.path
                should_check = url_path.startswith(f"/{dataroot}/") or (
                    "/s3_uri/" in url_path and f"/{dataroot}/" in unquote(url_path)
                )

                if should_check:
                    # Skip authentication for OPTIONS requests (CORS preflight)
                    if request.method == "OPTIONS":
                        return None

                    try:
                        user_id = common_rest._resolve_request_user_id(request)
                        if user_id is None:
                            # No user ID means auth is disabled, which should not have access to /w/
                            return make_response("Unauthorized access to /w/ dataroot", HTTPStatus.UNAUTHORIZED)

                        # Skip user ID path validation for local-dev-user (development/testing)
                        if not user_id.startswith(common_rest.LOCAL_DEV_USER_PREFIX):
                            # Check if the user_id from header matches the user_id in the URL path
                            # For s3_uri paths, also check the decoded URL
                            user_id_pattern = f"/{re.escape(user_id)}/"
                            decoded_path = unquote(url_path)

                            if not (re.search(user_id_pattern, url_path) or re.search(user_id_pattern, decoded_path)):
                                return make_response(
                                    f"User ID mismatch: authenticated user '{escape(user_id)}' does not match URL path",
                                    HTTPStatus.FORBIDDEN,
                                )
                    except Exception:
                        # If we can't resolve user ID (e.g., not in VCP deployment), deny access
                        return make_response("Unauthorized access to /w/ dataroot", HTTPStatus.UNAUTHORIZED)

            bp_dataroot_custom = Blueprint(
                name=f"api_dataset_{url_dataroot}_custom_cxgs_{api_version.replace('.',',')}",
                import_name=__name__,
                url_prefix=(
                    f"{api_url_prefix}/{url_dataroot}/{CUSTOM_CXG_KEY_NAME}/<path:dataset>.cxg" + api_version
                ).replace("//", "/"),
            )
            dataroot_resources_custom = get_api_dataroot_resources(bp_dataroot_custom, url_dataroot)
            app.register_blueprint(dataroot_resources_custom.blueprint)

        # Static asset routes
        app.add_url_rule(
            f"/{url_dataroot}/<string:dataset>/static/<path:filename>",
            f"static_assets_{url_dataroot}",
            view_func=lambda dataset, filename: send_from_directory("../common/web/static", filename),
            methods=["GET"],
        )
        app.add_url_rule(
            f"/{url_dataroot}/{CELLGUIDE_CXG_KEY_NAME}/<path:dataset>.cxg/static/<path:filename>",
            f"static_assets_{url_dataroot}_cellguide_cxgs/",
            view_func=lambda dataset, filename: send_from_directory("../common/web/static", filename),
            methods=["GET"],
        )
        if url_dataroot == "w":
            app.add_url_rule(
                f"/{url_dataroot}/{CUSTOM_CXG_KEY_NAME}/<path:dataset>.cxg/static/<path:filename>",
                f"static_assets_{url_dataroot}_custom_cxgs/",
                view_func=lambda dataset, filename: send_from_directory("../common/web/static", filename),
                methods=["GET"],
            )

        # Add agent endpoint for each dataroot
        app.add_url_rule(
            f"{api_url_prefix}/{url_dataroot}/<string:dataset>/api/v0.3/agent/step",
            f"agent_step_{url_dataroot}",
            view_func=lambda: common_agent.agent_step_post(request),
            methods=["POST"],
        )
