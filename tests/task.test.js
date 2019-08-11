const request = require('supertest');
const app = require('../src/app');
const Task = require('../src/models/task');
const { userOneId, userOne, userTwoId, userTwo, taskOne, taskTwo, taskThree, setupDatabase } = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should create task for user', async () => {
    const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            description: 'From my test',
        })
        .expect(201);
    const task = await Task.findById(response.body._id);
    expect(task).not.toBeNull();
    expect(task.completed).toEqual(false);
});

test('Should fetch user tasks', async () => {
    const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200);
    expect(response.body.length).toEqual(2);
});

test('Should not delete other user tasks', async () => {
    const response = await request(app)
        .delete(`/tasks/${taskOne._id}`)
        .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
        .send()
        .expect(404);
    const task = await Task.findById(taskOne._id);
    expect(task).not.toBeNull();
});

// Task Test Ideas
test('Should not create task with invalid description/completed', async () => {
    const responseOne = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            description: 'take out the trash',
            completed: 'maybe',
        })
        .expect(400);

    const responseTwo = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            completed: false,
        })
        .expect(400);
    expect(responseOne.body.errors).not.toBeNull();
    expect(responseTwo.body.errors).not.toBeNull();
});

test('Should not update task with invalid description/completed', async () => {
    const responseOne = await request(app)
        .patch(`/tasks/${taskOne._id}`)
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            description: '',
        })
        .expect(400);

    const responseTwo = await request(app)
        .patch(`/tasks/${taskOne._id}`)
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            completed: 'yesterday',
        })
        .expect(400);
    expect(responseOne.body.errors).not.toBeNull();
    expect(responseTwo.body.errors).not.toBeNull();
});

test('Should delete user task', async () => {
    await request(app)
        .delete(`/tasks/${taskOne._id}`)
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200);
    const nonExitantTask = await Task.findById(taskOne._id);
    expect(nonExitantTask).toBeNull();
});

test('Should not delete task if unauthenticated', async () => {
    await request(app)
        .delete(`/tasks/${taskOne._id}`)
        .send()
        .expect(401);
    const task = await Task.findById(taskOne._id);
    expect(task).not.toBeNull();
});

test('Should not update other users task', async () => {
    await request(app)
        .patch(`/tasks/${taskThree._id}`)
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            completed: true,
        })
        .expect(404);
    const task = await Task.findById(taskThree._id);
    expect(task.completed).toBe(false);
});

test('Should fetch user task by id', async () => {
    const response = await request(app)
        .get(`/tasks/${taskOne._id}`)
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200);
    expect(response.body._id).toBe(taskOne._id.toString());
});

test('Should not fetch user task by id if unauthenticated', async () => {
    await request(app)
        .get(`/tasks/${taskOne._id}`)
        .send()
        .expect(401);
});

test('Should not fetch other users task by id', async () => {
    await request(app)
        .get(`/tasks/${taskOne._id}`)
        .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
        .send()
        .expect(404);
});

test('Should fetch only incomplete tasks', async () => {
    const response = await request(app)
        .get('/tasks?completed=false')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200);
    expect(response.body.every(task => task.completed === false)).toEqual(true);
});

test('Should sort tasks by description/completed/createdAt/updatedAt', async () => {
    const sortType = ['description', 'completed', 'createdAt', 'updatedAt'];
    const sortOrder = ['asc', 'desc'];

    for (let i = 0; i < sortType.length; i += 1) {
        for (let j = 0; j < sortOrder.length; j += 1) {
            const response = await request(app)
                .get(`/tasks?sortBy=${sortType[i]}:${sortOrder[j]}`)
                .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
                .send()
                .expect(200);

            expect(
                response.body.every((task, index, arr) => {
                    if (index === 0) {
                        return true;
                    }
                    if (sortOrder[j] === 'asc') {
                        return task[sortType[i]] >= arr[index - 1][sortType[i]];
                    }
                    return task[sortType[i]] <= arr[index - 1][sortType[i]];
                })
            ).toBe(true);
        }
    }
});

// This test seems to be covered by the response from the previous test
test('Should fetch page of tasks', async () => {
    const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .expect(200);
    expect(response.body).toEqual(expect.any(Array));
});
