# Logging

Gateway uses Pino for logging. By default, the log output is JSON formatted.

Set `LOG_LEVEL` to one of `error`, `warn`, `info`, `debug`, or `trace` from least to most verbose.

In addition, if `PRETTY=true` is set in the .env file for a given app, this applies the `pino-pretty` decorator
in the logs, for a colorized, more human-readable format.

# Monitoring

Gateway exposes the default Prometheus metrics at `/metrics`. A local [Prometheus server](https://prometheus.io/) can be
installed and pointed at
this endpoint for debugging or other purposes.