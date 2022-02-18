import sys
import argparse
import random
import time
import numpy as np

from server.common.config.app_config import AppConfig
from server.compute import diffexp_cxg
from server.common.compute import diffexp_generic
from server.dataset.matrix_loader import MatrixDataLoader
from server.dataset.cxg_dataset import CxgDataset


def main():
    parser = argparse.ArgumentParser("A command to test diffexp")
    parser.add_argument("dataset", help="name of a dataset to load")
    parser.add_argument("-na", "--numA", type=int, help="number of rows in group A")
    parser.add_argument("-nb", "--numB", type=int, help="number of rows in group B")
    parser.add_argument("-va", "--varA", help="obs variable:value to use for group A")
    parser.add_argument("-vb", "--varB", help="obs variable:value to use for group B")
    parser.add_argument("-t", "--trials", default=4, type=int, help="number of trials")
    parser.add_argument(
        "-a", "--alg", choices=("default", "generic", "cxg", "new", "old", "new2"), default="new", help="algorithm to use"
    )
    parser.add_argument("-s", "--show", default=False, action="store_true", help="show the results")
    parser.add_argument(
        "-n", "--new-selection", default=True, action="store_true", help="change the selection between each trial"
    )
    parser.add_argument("--seed", default=4, type=int, help="set the random seed")
    parser.add_argument("--arr", default="X", type=str, help="tdb array to use")

    args = parser.parse_args()

    app_config = AppConfig()
    app_config.update_server_config(single_dataset__datapath=args.dataset)
    app_config.update_server_config(app__verbose=True)
    app_config.update_server_config(app__flask_secret_key="howdy")
    app_config.complete_config()

    loader = MatrixDataLoader(location=args.dataset, app_config=app_config)
    adaptor = loader.open()
    np.set_printoptions(edgeitems=10, linewidth=180)

    # if args.show:
    #     if isinstance(adaptor, CxgDataset):
    #         adaptor.open_array(args.arr).schema.dump()

    random.seed(args.seed)
    np.random.seed(args.seed)
    rows = adaptor.get_shape()[0]
    print(f"Dataset shape: {adaptor.get_shape()}")
    print(f"Sparse: {adaptor.open_array(args.arr).schema.sparse}")

    if args.numA:
        filterA = random.sample(range(rows), args.numA)
    elif args.varA:
        vname, vval = args.varA.split(":")
        filterA = get_filter_from_obs(adaptor, vname, vval)
    else:
        print("must supply numA or varA")
        sys.exit(1)

    if args.numB:
        filterB = random.sample(range(rows), args.numB)
    elif args.varB:
        vname, vval = args.varB.split(":")
        filterB = get_filter_from_obs(adaptor, vname, vval)
    else:
        print("must supply numB or varB")
        sys.exit(1)

    for i in range(args.trials):
        if args.new_selection:
            if args.numA:
                filterA = random.sample(range(rows), args.numA)
            if args.numB:
                filterB = random.sample(range(rows), args.numB)
        with open("filt_a.npy", "wb") as f:
            np.save(f, filterA)
        # if args.show:
        #     print(filterA)
        #     print(filterB)

        maskA = np.zeros(rows, dtype=bool)
        maskA[filterA] = True
        maskB = np.zeros(rows, dtype=bool)
        maskB[filterB] = True

        t1 = time.time()
        if args.alg in ("default", "old"):
            results = adaptor.compute_diffexp_ttest(maskA, maskB, arr=args.arr)
        if args.alg == "new":
            results = adaptor.compute_diffexp_new(maskA, maskB, arr=args.arr)
        if args.alg == "new2":
            results = adaptor.compute_diffexp_new2(maskA, maskB, arr=args.arr)
        elif args.alg == "generic":
            results = diffexp_generic.diffexp_ttest(adaptor, maskA, maskB)

        t2 = time.time()
        print("TIME=", t2 - t1)

    if args.show:
        print(results.get("positive", [])[:3])


def get_filter_from_obs(adaptor, obsname, obsval):
    attrs = adaptor.get_obs_columns()
    if obsname not in attrs:
        print(f"Unknown obs attr {obsname}: expected on of {attrs}")
        sys.exit(1)
    obsvals = adaptor.query_obs_array(obsname)[:]
    obsval = type(obsvals[0])(obsval)

    vfilter = np.where(obsvals == obsval)[0]
    if len(vfilter) == 0:
        u = np.unique(obsvals)
        print(f"Unknown value in variable {obsname}:{obsval}: expected one of {list(u)}")
        sys.exit(1)

    return vfilter


if __name__ == "__main__":
    main()
