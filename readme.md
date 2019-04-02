# Migrate CouchDB to MongoDB

This tool performs the migration of data from a CouchDB instance to a MongoDB instance.
The behaviour of the tool can be changed using environment variables.

Since CouchDB and MongoDB are structured slightly different, the convention is to migrate each CouchDB database to a 
separate collection within a separate database.

E.g. imagine you have 2 CouchDB databases `horses` and `dogs`. The migration tool will create new MongoDB databases for
each of them, with a collection with the same name inside. So you end up with:

- Database `horses` with 1 collection `horses`
- Database `dogs` with 1 collection `dogs`

The migration tool will not migrate `_design` documents.

## Configuration

The tool offers the following configuration passed in via environment variables:

- `COUCH` - the url to the source database (default: `http://localhost:5984`)
- `MONGO` - the URL to the target database (default: `mongodb://localhost:27017`)
- `DB_LIST` - optional comma-separated list to limit the databases to copy (default: ALL databases, except system databases)
