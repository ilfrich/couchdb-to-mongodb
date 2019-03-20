import nano from "nano"
import mongodb from "mongodb"

const COUCH_HOST = process.env.COUCH || "http://localhost:5984"
const MONGO_HOST = process.env.MONGO || "mongodb://localhost:27017"

const couchServer = nano(COUCH_HOST)
const mongoServer = mongodb.MongoClient(MONGO_HOST)

const databaseList = []
const startDate = new Date().getTime()

couchServer.db.list().then(databases => {
    databases.forEach(databaseName => {
        if (databaseName.startsWith("_")) {
            // skip system databases
            return
        }

        databaseList.push(databaseName)
    })
})

const migrateDatabase = (dbList, index = 0) => {
    if (index >= dbList.length) {
        return new Promise(resolve => {
            resolve()
        })
    }

    console.log("Migrating database", dbList[index])
    const db = couchServer.use(dbList[index])
    const promises = []
    const mongo = mongoServer.db(dbList[index])
    const collection = mongo.collection(dbList[index])
    db.list().then(documents => {
        documents.forEach(doc => {
            // skip design documents
            if (doc._id.startsWith("_design")) {
                return
            }

            promises.push(collection.insertOne(doc))
        })
    })

    return Promise.all(promises).then(() => {
        console.log("Done")
        return migrateDatabase(dbList, index + 1)
    })
}

// call the migration script with the database list
migrateDatabase(databaseList).then(() => {
    const duration = (new Date().getTime() - startDate) / 1000
    console.log("Migration finished in", duration, "seconds")
})
