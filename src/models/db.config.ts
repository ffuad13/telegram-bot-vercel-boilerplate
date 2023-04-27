import * as mongoDB from 'mongodb';

export const collections: { timeUser?: mongoDB.Collection } = {};

export async function connectToDatabase() {
  const mongoUri: string = process.env.MONGODB_URI as string;
  const dbName: string = process.env.DB_NAME as string;

  const client: mongoDB.MongoClient = new mongoDB.MongoClient(mongoUri);

  await client.connect();

  const db: mongoDB.Db = client.db(dbName);

  const timeUsersCollection: mongoDB.Collection = db.collection('timeUser');

  collections.timeUser = timeUsersCollection;

  console.log(
    `Successfully connected to database: ${db.databaseName} and collection: ${timeUsersCollection.collectionName}`
  );
}
