# Redis container

Since we are adding rate limiting using redis and background worker queues using BullMQ. A redis server will be required.

To run a redis docker container locally, install docker and run

`docker run -d --name redis-server -p 6379:6379 redis`

this command will download redis image and start a docker container on port 6379

and after that, whenever you want to run redis again, all you have to run is

`docker start redis-server`
