import amqp, { Connection, Channel } from 'amqplib';
import { logger } from './logger';
import { env } from './env';

let connection: any = null;
let channel: any = null;

export const rabbitmq = {
  connect: async (): Promise<void> => {
    const url = env.RABBITMQ_URL;
    try {
      connection = await amqp.connect(url);
      channel = await connection.createChannel();
      logger.info('Connected to RabbitMQ successfully');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', { error: (error as Error).message });
    }
  },
  publishTask: async (queueName: string, taskData: unknown): Promise<boolean> => {
    try {
      if (!channel) {
        await rabbitmq.connect();
      }
      if (!channel) {
        throw new Error('RabbitMQ channel not available');
      }
      await channel.assertQueue(queueName, { durable: true });
      return channel.sendToQueue(queueName, Buffer.from(JSON.stringify(taskData)), { persistent: true });
    } catch (error) {
      logger.error('Error publishing task to RabbitMQ', { queueName, error: (error as Error).message });
      return false;
    }
  },
  getChannel: () => channel,
};
