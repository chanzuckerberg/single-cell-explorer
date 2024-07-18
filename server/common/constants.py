from enum import Enum


class AugmentedEnum(Enum):
    def __hash__(self):  # type: ignore
        return self.value.__hash__()

    def __eq__(self, other):  # type: ignore
        if isinstance(other, (type(self), str)):
            return self.value == other
        return False

    def __str__(self) -> str:  # type: ignore
        return self.value  # type: ignore


class Axis(AugmentedEnum):
    OBS = "obs"
    VAR = "var"


class DiffExpMode(AugmentedEnum):
    TOP_N = "topN"
    VAR_FILTER = "varFilter"


class XApproximateDistribution(AugmentedEnum):
    NORMAL = "normal"
    COUNT = "count"


JSON_NaN_to_num_warning_msg = "JSON encoding failure - please verify all data are finite values (no NaN or Infinities)"
REACTIVE_LIMIT = 1_000_000

MAX_LAYOUTS = 30

CELLGUIDE_CXG_KEY_NAME = "cellguide-cxgs"

CELLGUIDE_BASE_URL = "https://cellguide.cellxgene.cziscience.com"
