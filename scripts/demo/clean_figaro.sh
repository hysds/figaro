#!/bin/bash

source $HOME/mozart/bin/activate

#rm -rf $HOME/figaro/log/*

# clean out mongo
mongo figaro --eval "db.dropDatabase();"

# clean out rabbitmq
sudo rabbitmqctl stop_app
sudo rabbitmqctl reset
sudo rabbitmqctl start_app

exit 0
