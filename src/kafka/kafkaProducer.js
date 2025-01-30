import { Kafka } from "kafkajs";

const kafka = new Kafka({
    clientId:'Attendance-management',
    brokers:['localhost:29092']
})

const producer = kafka.producer();

export const sendMessage =async (message)=>{
await producer.connect();
console.log('Kafka producer connected');

// const message = {id:"123",textMessage:"hello world"};

await producer.send({
    topic:'test-topic',
    messages: [{ value : JSON.stringify(message)}]
})
console.log(`Message sent: ${JSON.stringify(message)}`);
  await producer.disconnect();
}


// run().catch(console.error);