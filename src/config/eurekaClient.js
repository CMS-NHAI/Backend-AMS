const Eureka = require('eureka-js-client').Eureka;

const client = new Eureka({
  // Eureka server host and port (match with Eureka server's settings)
  eureka: {
    host: 'localhost',
    port: 8761,
    servicePath: '/eureka/apps/',
  },
  // Your Node.js service details
  // Your Node.js service details
  instance: {
    app: 'node-service', // Name of your service
    hostName: 'localhost',
    ipAddr: '127.0.0.1',  // Localhost IP or the server IP if deploying to a cloud
    port: {
      $: 3000,  // Port your Node.js app will be listening on
      '@enabled': 'true',
    },
    vipAddress: 'node-service',
    dataCenterInfo: {
      // This can be customized, but we'll use default values here
      name: 'MyOwn',
    },
  },
});

// Start Eureka client to register the service
client.start((error) => {
  console.log('Eureka client started', error || '');
});
