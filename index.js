const express = require('express')
const cors = require('cors')
require('dotenv').config()


const port = process.env.PORT || 5000
const app = express()

app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lue0n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const database = client.db('hotelBooking');
        const roomCollection = database.collection('roomCollection');


        app.get('/rooms', async (req, res) => {
            const result = await roomCollection.find().toArray();
            res.send(result)
            console.log(result)
        })

        app.get('/top-rooms', async (req, res) => {
            try {
                // Retrieve all rooms
                const rooms = await roomCollection.find().toArray();

                // Calculate average rating for each room
                const roomsWithAvgRatings = rooms.map(room => {
                    const reviews = room.review || [];
                    const avgRating = reviews.length > 0
                        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                        : 0;
                    return { ...room, avgRating };
                });

                // Sort rooms by average rating in descending order and get the top 6
                const topRatedRooms = roomsWithAvgRatings
                    .sort((a, b) => b.avgRating - a.avgRating)
                    .slice(0, 6);

                // Send the top-rated rooms as response
                res.send(topRatedRooms);
                console.log(topRatedRooms);
            } catch (error) {
                console.error('Error retrieving rooms:', error);
                res.status(500).send({ message: 'Failed to retrieve rooms' });
            }
        });

        app.post('/add-rooms', async (req, res) => {
            const roomData = req.body;
            const result = await roomCollection.insertOne(roomData);
            res.send(result)
            console.log(result)
        })

    } finally {

    }
}
run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Hello from Hotel Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
