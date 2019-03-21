import nano from "nano"
import mongodb from "mongodb"

const COUCH_HOST = process.env.COUCH || "http://localhost:5984"
const MONGO_HOST = process.env.MONGO || "mongodb://localhost:27017"

const couchServer = nano(COUCH_HOST)
const mongoServer = mongodb.MongoClient.connect(MONGO_HOST)

const databaseList = []
const startDate = new Date().getTime()

let mongoClient = null
const existingMongoDbs = []

const migrateDocument = (db, collection, docIdList, checkDuplicates = false, index = 0) => {
    if (index >= docIdList.length) {
        return new Promise(resolve => {
            resolve()
        })
    }
    const docId = docIdList[index]
    if (checkDuplicates) {
        return collection.find({ _id: docId }).toArray().then(docList => {
            if (docList.length == 0) {
                return db.get(docId).then(doc => collection.insertOne(doc)).then(() => migrateDocument(db, collection, docIdList, checkDuplicates, index + 1))
            } else {
                return migrateDocument(db, collection, docIdList, checkDuplicates, index + 1)
            }
        })
    } else {
        return db.get(docId).then(doc => collection.insertOne(doc))
            .then(() => migrateDocument(db, collection, docIdList, checkDuplicates, index + 1))
    }
}

// declare function for recursive database migration
const migrateDatabase = (dbList, index = 0) => {
    if (index >= dbList.length) {
        return new Promise(resolve => {
            resolve()
        })
    }
    console.log("Migrating database", dbList[index])
    const mongoName = dbList[index].replace(new RegExp("[-]", "g"), "")
    const db = couchServer.use(dbList[index])
    console.log("Mongo name:", mongoName)
    const mongo = mongoClient.db(mongoName)
    const collection = mongo.collection(mongoName)

    return db.list()
        .then(documents => {
            console.log("Processing", documents.rows.length, "documents")
            return migrateDocument(db, collection, documents.rows.map(docKey => docKey.id).filter(id => !id.startsWith("_design")), existingMongoDbs.indexOf(mongoName) !== -1)
        })
        .then(() => {
            console.log("Done")
            return migrateDatabase(dbList, index + 1)
        })
}

mongoServer.then(client => {
        mongoClient = client
        const admin = mongoClient.db("admin").admin()
        return admin.listDatabases()
    })
    .then(adminData => {
        adminData.databases.forEach(dbName => {
            existingMongoDbs.push(dbName)
        })
        return couchServer.db.list()
    })
    .then(databases => {
        console.log("Found databases", databases)
        databases.forEach(databaseName => {
            if (databaseName.startsWith("_")) {
                // skip system databases
                return
            }

            databaseList.push(databaseName)
        })
    })
    .then(() => {
        // call the migration script with the database list
        console.log("Migrating", databaseList.length, "databases")
        return migrateDatabase(databaseList)
    })
    .then(() => {
        const duration = (new Date().getTime() - startDate) / 1000
        console.log("Migration finished in", duration, "seconds")
    })
    .catch(err => {
        console.log("Error", err)
    })
