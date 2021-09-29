import json
import os
import pprint


def json_value(d: dict, *keys):
    for k in keys:
        d = d.get(k, {})

    return d

Metadata = namedtuple(url, version, corpora_encoding_version, corpora_schema_version, schema_version)

if __name__ == '__main__':
    with open(os.path.expanduser('~/cxg/sandbox/cxg_datasets_metadata.json'), 'r') as f:
        cxg_metadata = json.load(f)

    pprint.pprint([Metadata(json_value(metadata, 'url'),
                        json_value(metadata, 'version'),
                        json_value(metadata, 'corpora_props', 'version', 'corpora_encoding_version'),
                        json_value(metadata, 'corpora_props', 'version', 'corpora_schema_version'),
                        json_value(metadata, 'corpora_props', 'schema_version')
                        )
                       for metadata in cxg_metadata])

