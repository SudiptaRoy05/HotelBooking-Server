const express = require('express')
const cors = require('cors')
require('dotenv').config()


const port = process.env.PORT || 5000
const app = express()

app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const reviewCollection = database.collection('reviewCollection')
        const bookingCollection = database.collection('bookingCollection');


        app.get('/rooms', async (req, res) => {
            const result = await roomCollection.find().toArray();
            res.send(result)
            console.log(result)
        })

        app.get('/top-rooms', async (req, res) => {
            try {

                const rooms = await roomCollection.find().toArray();

                const roomsWithAvgRatings = rooms.map(room => {
                    const reviews = room.review || [];
                    const avgRating = reviews.length > 0
                        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                        : 0;
                    return { ...room, avgRating };
                });
                const topRatedRooms = roomsWithAvgRatings
                    .sort((a, b) => b.avgRating - a.avgRating)
                    .slice(0, 6);

                res.send(topRatedRooms);

            } catch (error) {
                console.error('Error retrieving rooms:', error);
                res.status(500).send({ message: 'Failed to retrieve rooms' });
            }
        });

        app.get('/room-details/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await roomCollection.findOne(query);
            res.send(result);
        })

        // review post api 
        app.post('/add-review/:id', async (req, res) => {
            const review = req.body
            const result = await reviewCollection.insertOne(review);
            res.send(result)
        })

        app.get('/review/:id', async (req, res) => {

            const id = req.params.id;
            const query = { roomId: id }
            // console.log({ roomId })
            console.log(query)
            const result = await reviewCollection.find(query).toArray();
            res.send(result);
        });


        app.post('/add-rooms', async (req, res) => {
            const roomData = req.body;
            const result = await roomCollection.insertOne(roomData);
            res.send(result)
        })

        app.patch('/add-rooms/:id', async (req, res) => {
            const { status } = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const update = {
                $set: { status: status }
            }

            const result = await roomCollection.updateOne(filter, update);
            res.send(result)

        })


        app.get('/my-booking/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })
        // booking post api 
        app.post('/add-booking', async (req, res) => {
            const bookingData = req.body;
            const result = await bookingCollection.insertOne(bookingData);
            res.send(result);
        })

    } finally {

    }
}
run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Hello from Hotel Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
