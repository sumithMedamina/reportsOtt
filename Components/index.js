const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/Ott', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

// Helper function to get field names dynamically from MongoDB collections
async function getFieldNamesFromCollection(collectionName) {
    const collection = mongoose.connection.collection(collectionName);
    const document = await collection.findOne({});
    return document ? Object.keys(document) : [];
}

// GET endpoint to retrieve field names
app.get('/fields-data', async (req, res) => {
    try {
        const organizationFields = await getFieldNamesFromCollection('organization');
        const scriptFields = await getFieldNamesFromCollection('script');
        const userFields = await getFieldNamesFromCollection('ottuser');

        const dict_data = {
            'Organisation': organizationFields,
            'Script': scriptFields,
            'User': userFields
        };

        res.json(dict_data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST endpoint for generating reports
app.post('/generate-reports', async (req, res) => {
    try {
        const { organisation_fields, script_fields, user_fields, conditions } = req.body;

        // Ensure validConditions is defined, even if it's an empty object
        const validConditions = conditions || {};

        // Separate the conditions for each collection
        const userConditions = {};
        const organizationConditions = {};
        const scriptConditions = {};

        // Split conditions based on which collection the fields belong to
        for (const [key, value] of Object.entries(validConditions)) {
            if (user_fields.includes(key)) {
                userConditions[key] = value;
            }
            if (organisation_fields.includes(key)) {
                organizationConditions[key] = value;
            }
            if (script_fields.includes(key)) {
                scriptConditions[key] = value;
            }
        }

        // Build projections for each collection
        const userProjection = user_fields.reduce((acc, field) => ({ ...acc, [field]: 1 }), {});
        const organizationProjection = organisation_fields.reduce((acc, field) => ({ ...acc, [field]: 1 }), {});
        const scriptProjection = script_fields.reduce((acc, field) => ({ ...acc, [field]: 1 }), {});

        // Query each collection with the relevant conditions and projections
        const users = await mongoose.connection.collection('ottuser')
            .find(userConditions)
            .project(userProjection)
            .toArray();

        const organization_data = await mongoose.connection.collection('organization')
            .find(organizationConditions)
            .project(organizationProjection)
            .toArray();

        const scripts_data = await mongoose.connection.collection('script')
            .find(scriptConditions)
            .project(scriptProjection)
            .toArray();

        // Combine the data into a single response
        const response_data = {
            "organisation": organization_data,
            "script": scripts_data,
            "user": users
        };

        res.json(response_data);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});




// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
