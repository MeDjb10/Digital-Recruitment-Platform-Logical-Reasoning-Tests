export const setRoutes = (app) => {
    app.use('/auth', require('../auth-service/routes').default);
    app.use('/tests', require('../test-service/routes').default);
    app.use('/ai', require('../ai-service/routes').default);
};