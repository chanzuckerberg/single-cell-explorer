import random
import string
from os import popen

PROJECT_ROOT = popen("git rev-parse --show-toplevel").read().strip()
FIXTURES_ROOT = PROJECT_ROOT + "/server/tests/fixtures"
FIXTURES_ROOT_UNS = PROJECT_ROOT + "/example-dataset/"


def random_string(n):
    return "".join(random.choice(string.ascii_letters) for _ in range(n))
