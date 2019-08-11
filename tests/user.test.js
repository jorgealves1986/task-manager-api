const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user');
const { userOneId, userOne, userTwoId, userTwo, taskOne, taskTwo, taskThree, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should signup a new user', async () => {
    const response = await request(app)
        .post('/users')
        .send({
            name: 'Jorge',
            email: 'jorge@example.com',
            password: 'MyPass777!',
        })
        .expect(201);

    // Assert that the database was changed correctly
    const user = await User.findById(response.body.user._id);
    expect(user).not.toBeNull();

    // Assertions about the response
    expect(response.body).toMatchObject({
        user: {
            name: 'Jorge',
            email: 'jorge@example.com',
        },
        token: user.tokens[0].token,
    });
    expect(user.password).not.toBe('MyPass777!');
});

test('Should login existing user', async () => {
    const response = await request(app)
        .post('/users/login')
        .send({
            email: userOne.email,
            password: userOne.password,
        })
        .expect(200);

    const user = await User.findById(userOneId);
    expect(response.body.token).toBe(user.tokens[1].token);
});

test('Should not login nonexistent user', async () => {
    await request(app)
        .post('/users/login')
        .send({
            email: userOne.email,
            password: 'noPe!!??',
        })
        .expect(400);
});

test('Should get profile for user', async () => {
    await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200);
});

test('Should not get profile for unauthenticated user', async () => {
    await request(app)
        .get('/users/me')
        .send()
        .expect(401);
});

test('Should delete account for user', async () => {
    await request(app)
        .delete('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200);

    const user = await User.findById(userOneId);
    expect(user).toBeNull();
});

test('Should not delete account for unauthenticated user', async () => {
    await request(app)
        .delete('/users/me')
        .send()
        .expect(401);
});

test('Should upload avatar image', async () => {
    await request(app)
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .attach('avatar', 'tests/fixtures/profile-pic.jpg')
        .expect(200);
    const user = await User.findById(userOneId);
    expect(user.avatar).toEqual(expect.any(Buffer));
});

test('Should update valid user fields', async () => {
    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            name: 'Freddy',
        })
        .expect(200);
    const user = await User.findById(userOneId);
    expect(user.name).toEqual('Freddy');
});

test('Should not update invalid user fields', async () => {
    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            location: 'Recardães City',
        })
        .expect(400);
});

// User Test Ideas
test('Should not signup user with invalid name/email/password', async () => {
    await request(app)
        .post('/users')
        .send({
            name: '',
            email: 'john@example.com',
            password: 'abc1234',
        })
        .expect(400);

    const responseDupEmail = await request(app)
        .post('/users')
        .send({
            name: 'john smith',
            email: userOne.email,
            password: 'abc1234',
        })
        .expect(400);
    expect(responseDupEmail.body.code).toEqual(11000);

    await request(app)
        .post('/users')
        .send({
            name: 'john smith',
            email: 'john@example.com',
            password: 'passWord1234',
        })
        .expect(400);
});

test('Should not update user if unauthenticated', async () => {
    const response = await request(app)
        .patch('/users/me')
        .send({
            email: 'john@example.com',
        })
        .expect(401);
    expect(response.body.error).toEqual('Please authenticate.');
});

test('Should not update user with invalid name/email/password', async () => {
    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            name: '',
        })
        .expect(400);

    const responseDupEmail = await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            email: userTwo.email,
        })
        .expect(400);
    expect(responseDupEmail.body.code).toEqual(11000);

    await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            password: 'myPassword12345',
        })
        .expect(400);
});

test('Should not delete user if unauthenticated', async () => {
    const response = await request(app)
        .delete('/users/me')
        .send()
        .expect(401);
    expect(response.body.error).toEqual('Please authenticate.');
});
