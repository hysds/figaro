import os
import sys
import json
import time
import pprint
import subprocess
from flask import jsonify, Blueprint


from figaro import app

mod = Blueprint('services/admin', __name__)


@mod.route('/services/admin/clean', methods=['GET'])
def clean():
    """Clean out figaro's mongodb database and rabbitmq queues."""

    ret = {
        'success': True
    }

    # clean figaro
    clean_script = os.path.normpath(
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            '..', '..', 'scripts', 'demo',
            'clean_figaro.sh'
        )
    )
    app.logger.debug("clean figaro: %s" % clean_script)
    subprocess.call([clean_script], shell=True)

    # sleep while rabbitmq restarts
    time.sleep(5)

    # queue cleaning puccini
    clean_script = os.path.normpath(
        os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            '..', '..', 'scripts', 'demo',
            'queue_clean_puccini.py'
        )
    )
    app.logger.debug("clean puccini: %s" % clean_script)
    subprocess.call([clean_script], shell=True)

    return jsonify(ret)
