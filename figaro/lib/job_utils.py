from __future__ import unicode_literals
from __future__ import print_function
from __future__ import division
from __future__ import absolute_import
from future import standard_library
standard_library.install_aliases()
import requests
import json
from pymongo import MongoClient
from pprint import pformat


def get_mongo_client():
    """Return MongoDB client."""

    return MongoClient('mongodb://localhost/')


def get_db():
    """Return figaro MongoDB database."""

    return get_mongo_client()['figaro']


def get_execute_nodes():
    """Return the names of all execute nodes."""

    query = {
        "size": 0,
        "facets": {
            "job.job_info.execute_node": {
                "terms": {
                    "field": "job.job_info.execute_node",
                    "all_terms": True
                }
            }
        }
    }
    es_url = app.config['ES_URL']
    index = app.config['JOB_STATUS_INDEX']
    r = requests.post('%s/%s/_search' %
                      (es_url, index), data=json.dumps(query))
    r.raise_for_status()
    result = r.json()
    # app.logger.debug(pformat(result))
    total = len(result['facets']['job.job_info.execute_node']['terms'])
    nodes = []
    for terms in result['facets']['job.job_info.execute_node']['terms']:
        nodes.append(terms['term'])
    nodes.sort()
    return nodes
