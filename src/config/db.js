const mongoose = require('mongoose');

async function connect() {
    const uri = process.env.DB_URL;
    try {
        await mongoose.connect(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('mongodb connect success');
    } catch (error) {
        console.log('mongodb connect failed');
    }
}

module.exports = { connect };
