import cds from '@sap/cds';

const LOG = cds.log('server');

cds.on('bootstrap', (app) => {
    app.use((req, res, next) => {
        const origSend = res.send;
        res.send = function (body) {
            if (res.statusCode >= 400) {
                LOG.error(`${req.method} ${req.url} -> STATUS ${res.statusCode}:`, typeof body === 'string' ? body.substring(0, 500) : body);
            }
            return origSend.apply(this, arguments);
        };
        next();
    });
});

export default cds.server;
