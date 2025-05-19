const request = require('supertest');
const express = require('express');
const router = require('../../routes/boards'); // Adjust path if necessary
const Board = require('../../models/Board');   // Adjust path if necessary

// Mock the Board model
jest.mock('../../models/Board'); // Adjust path if necessary

// Create an Express application for testing
const app = express();
app.use(express.json());
app.use('/boards', router); // Mount the router at a base path, e.g., /boards

describe('Boards Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn(); // Mock console.error
  });

  // --- Test GET /boards/user/:userId ---
  describe('GET /boards/user/:userId', () => {
    it('should get all boards for a user successfully', async () => {
      const mockUserId = 'user123';
      const fixedDateString = new Date().toISOString(); // For consistent date strings
      const mockBoardsFromDb = [
        { _id: 'board1', title: 'Board 1', user: mockUserId, createdAt: new Date(fixedDateString) },
        { _id: 'board2', title: 'Board 2', user: mockUserId, createdAt: new Date(fixedDateString) },
      ];
      // This is what res.json() will serialize to (Date objects become ISO strings)
      const expectedJsonResponse = mockBoardsFromDb.map(board => ({
        ...board,
        createdAt: board.createdAt.toISOString(),
      }));

      Board.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockBoardsFromDb), // DB mock returns Date objects
      });

      const response = await request(app).get(`/boards/user/${mockUserId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expectedJsonResponse); // Compare against the expected JSON structure
      expect(Board.find).toHaveBeenCalledWith({ user: mockUserId });
      expect(Board.find().sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should return 500 if there is a server error fetching boards for a user', async () => {
      const mockUserId = 'user123';
      Board.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Server DB error')),
      });

      const response = await request(app).get(`/boards/user/${mockUserId}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Server error' });
      expect(console.error).toHaveBeenCalledWith('Get boards error:', expect.any(Error));
    });
  });

  // --- Test GET /boards/:id ---
  describe('GET /boards/:id', () => {
    it('should get a board by ID successfully', async () => {
      const mockBoardId = 'board123';
      const mockBoard = { // This is the plain object expected in the JSON response
        _id: mockBoardId,
        title: 'Test Board',
        pins: [],
        // If your model adds createdAt/updatedAt and they are part of the response:
        // createdAt: new Date().toISOString(),
        // updatedAt: new Date().toISOString(),
      };
      Board.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockBoard), // populate resolves with the board object
      });

      const response = await request(app).get(`/boards/${mockBoardId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockBoard);
      expect(Board.findById).toHaveBeenCalledWith(mockBoardId);
      expect(Board.findById().populate).toHaveBeenCalledWith('pins');
    });

    it('should return 404 if board not found', async () => {
      const mockBoardId = 'nonexistentboard';
      Board.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      const response = await request(app).get(`/boards/${mockBoardId}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Board not found' });
    });

    it('should return 500 if there is a server error fetching a board by ID', async () => {
      const mockBoardId = 'board123';
      Board.findById.mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error('Server DB error')),
      });

      const response = await request(app).get(`/boards/${mockBoardId}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Server error' });
      expect(console.error).toHaveBeenCalledWith('Get board error:', expect.any(Error));
    });
  });

  // --- Test POST /boards ---
  describe('POST /boards', () => {
    it('should create a new board successfully', async () => {
      const boardData = { title: 'New Board', description: 'A cool new board', userId: 'user456' };

      const expectedSavedBoard = {
        _id: 'mockGeneratedId123', // A specific mock ID
        title: boardData.title,
        description: boardData.description,
        user: boardData.userId,
        pins: [],
        // If timestamps are part of your schema and response:
        // createdAt: new Date().toISOString(), // Or expect.any(String)
        // updatedAt: new Date().toISOString(), // Or expect.any(String)
      };

      Board.mockImplementation(() => {
        const mockInstance = {
          title: boardData.title,
          description: boardData.description,
          user: boardData.userId,
          pins: [],
        };
        mockInstance.save = jest.fn().mockImplementation(() => {
          mockInstance._id = expectedSavedBoard._id; // Simulate Mongoose adding _id
          // If you have timestamps managed by Mongoose, simulate their addition here:
          // if (expectedSavedBoard.createdAt) mockInstance.createdAt = new Date(expectedSavedBoard.createdAt);
          // if (expectedSavedBoard.updatedAt) mockInstance.updatedAt = new Date(expectedSavedBoard.updatedAt);
          return Promise.resolve(mockInstance); // save() resolves with the instance itself
        });
        return mockInstance;
      });

      const response = await request(app).post('/boards').send(boardData);

      expect(response.status).toBe(201);
      // response.body is the JSON serialization of mockInstance after save
      expect(response.body).toEqual(expectedSavedBoard);

      expect(Board).toHaveBeenCalledWith({
        title: boardData.title,
        description: boardData.description,
        user: boardData.userId,
      });

      const mockBoardInstance = Board.mock.results[0].value;
      expect(mockBoardInstance.save).toHaveBeenCalled();
    });

    it('should return 500 if there is a server error creating a board', async () => {
      const boardData = { title: 'Error Board', description: 'This will fail', userId: 'user789' };
      Board.mockImplementation(() => ({
        title: boardData.title, // Include properties accessed before save, if any
        description: boardData.description,
        user: boardData.userId,
        pins: [],
        save: jest.fn().mockRejectedValue(new Error('DB save error')),
      }));

      const response = await request(app).post('/boards').send(boardData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Server error' });
      expect(console.error).toHaveBeenCalledWith('Create board error:', expect.any(Error));
    });
  });

  // --- Test PUT /boards/:id ---
  describe('PUT /boards/:id', () => {
    it('should update a board successfully', async () => {
      const mockBoardId = 'boardToUpdate';
      const updateData = { title: 'Updated Title', description: 'Updated Description' };
      const expectedUpdatedBoard = { // This is what findByIdAndUpdate's mock resolves to
        _id: mockBoardId,
        title: updateData.title,
        description: updateData.description,
        user: 'user123', // Assuming user is part of the board doc
        pins: [],      // Assuming pins are part of the board doc
        // updatedAt: new Date().toISOString(), // If applicable
      };
      Board.findByIdAndUpdate.mockResolvedValue(expectedUpdatedBoard);

      const response = await request(app).put(`/boards/${mockBoardId}`).send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(expectedUpdatedBoard);
      expect(Board.findByIdAndUpdate).toHaveBeenCalledWith(
        mockBoardId,
        { title: updateData.title, description: updateData.description },
        { new: true }
      );
    });

    it('should return 404 if board to update is not found', async () => {
      const mockBoardId = 'nonexistentboard';
      const updateData = { title: 'Updated Title' };
      Board.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app).put(`/boards/${mockBoardId}`).send(updateData);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Board not found' });
    });

    it('should return 500 if there is a server error updating a board', async () => {
      const mockBoardId = 'boardToUpdate';
      const updateData = { title: 'Updated Title' };
      Board.findByIdAndUpdate.mockRejectedValue(new Error('DB update error'));

      const response = await request(app).put(`/boards/${mockBoardId}`).send(updateData);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Server error' });
      expect(console.error).toHaveBeenCalledWith('Update board error:', expect.any(Error));
    });
  });

  // --- Test DELETE /boards/:id ---
  describe('DELETE /boards/:id', () => {
    it('should delete a board successfully', async () => {
      const mockBoardId = 'boardToDelete';
      const deletedBoardDocument = { _id: mockBoardId, title: 'Deleted Board' }; // What findByIdAndDelete returns
      Board.findByIdAndDelete.mockResolvedValue(deletedBoardDocument);

      const response = await request(app).delete(`/boards/${mockBoardId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Board deleted' });
      expect(Board.findByIdAndDelete).toHaveBeenCalledWith(mockBoardId);
    });

    it('should return 404 if board to delete is not found', async () => {
      const mockBoardId = 'nonexistentboard';
      Board.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app).delete(`/boards/${mockBoardId}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Board not found' });
    });

    it('should return 500 if there is a server error deleting a board', async () => {
      const mockBoardId = 'boardToDelete';
      Board.findByIdAndDelete.mockRejectedValue(new Error('DB delete error'));

      const response = await request(app).delete(`/boards/${mockBoardId}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Server error' });
      expect(console.error).toHaveBeenCalledWith('Delete board error:', expect.any(Error));
    });
  });

  // --- Test POST /boards/:id/pins ---
  describe('POST /boards/:id/pins', () => {
    it('should add a pin to a board successfully', async () => {
      const mockBoardId = 'board1';
      const mockPinId = 'pin123';

      const boardInstanceBeforePinAdd = { // Instance from findById
        _id: mockBoardId,
        title: 'Board with Pins',
        pins: [],
        save: jest.fn(),
      };
      const boardJsonAfterPinAdd = { // Expected JSON response after save
        _id: mockBoardId,
        title: 'Board with Pins',
        pins: [mockPinId],
      };
      // The save method on the instance resolves with the board's new state (as JSON response will be)
      boardInstanceBeforePinAdd.save.mockResolvedValue(boardJsonAfterPinAdd);
      Board.findById.mockResolvedValue(boardInstanceBeforePinAdd);

      const response = await request(app).post(`/boards/${mockBoardId}/pins`).send({ pinId: mockPinId });

      expect(response.status).toBe(200);
      expect(response.body.pins).toContain(mockPinId);
      expect(Board.findById).toHaveBeenCalledWith(mockBoardId);
      // The route logic mutates boardInstanceBeforePinAdd.pins
      expect(boardInstanceBeforePinAdd.pins).toContain(mockPinId);
      expect(boardInstanceBeforePinAdd.save).toHaveBeenCalled();
      expect(response.body).toEqual(boardJsonAfterPinAdd);
    });

    it('should not add a pin if it already exists on the board', async () => {
        const mockBoardId = 'board1';
        const mockPinId = 'pin123';

        const expectedJsonResponseBody = { // What the JSON response should look like
          _id: mockBoardId,
          title: 'Board with Pins',
          pins: [mockPinId],
        };
        const mockBoardInstanceWithSaveMethod = { // What Board.findById resolves to
          ...expectedJsonResponseBody,
          save: jest.fn(), // Save method exists but shouldn't be called
        };

        Board.findById.mockResolvedValue(mockBoardInstanceWithSaveMethod);

        const response = await request(app).post(`/boards/${mockBoardId}/pins`).send({ pinId: mockPinId });

        expect(response.status).toBe(200);
        // response.body should be the board as found, because no save occurs
        expect(response.body).toEqual(expectedJsonResponseBody);
        expect(response.body.pins).toEqual([mockPinId]);
        expect(Board.findById).toHaveBeenCalledWith(mockBoardId);
        expect(mockBoardInstanceWithSaveMethod.save).not.toHaveBeenCalled();
      });

    it('should return 404 if board not found when adding a pin', async () => {
      const mockBoardId = 'nonexistentboard';
      const mockPinId = 'pin123';
      Board.findById.mockResolvedValue(null);

      const response = await request(app).post(`/boards/${mockBoardId}/pins`).send({ pinId: mockPinId });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Board not found' });
    });

    it('should return 500 if server error when adding a pin (e.g., findById fails)', async () => {
      const mockBoardId = 'board1';
      const mockPinId = 'pin123';
      Board.findById.mockRejectedValue(new Error('DB find error'));

      const response = await request(app).post(`/boards/${mockBoardId}/pins`).send({ pinId: mockPinId });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Server error' });
      expect(console.error).toHaveBeenCalledWith('Add pin to board error:', expect.any(Error));
    });

    it('should return 500 if server error when adding a pin (e.g., save fails)', async () => {
        const mockBoardId = 'board1';
        const mockPinId = 'pin123';
        const boardInstance = { // Instance from findById
            _id: mockBoardId,
            title: 'Board with Pins',
            pins: [],
            save: jest.fn().mockRejectedValue(new Error('DB save error')),
        };
        Board.findById.mockResolvedValue(boardInstance);

        const response = await request(app).post(`/boards/${mockBoardId}/pins`).send({ pinId: mockPinId });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Server error' });
        expect(console.error).toHaveBeenCalledWith('Add pin to board error:', expect.any(Error));
        expect(boardInstance.save).toHaveBeenCalled();
      });
  });

  // --- Test DELETE /boards/:id/pins/:pinId ---
  describe('DELETE /boards/:id/pins/:pinId', () => {
    it('should remove a pin from a board successfully', async () => {
      const mockBoardId = 'board1';
      const mockPinIdToRemove = 'pinABC';
      const initialPins = ['pin123', mockPinIdToRemove, 'pin789'];
      const pinsAfterRemoval = ['pin123', 'pin789'];

      const boardInstanceBeforeRemoval = { // Instance from findById
        _id: mockBoardId,
        title: 'Board with Pins',
        pins: [...initialPins], // Use spread for mutable copy
        save: jest.fn(),
      };
      const boardJsonAfterRemoval = { // Expected JSON response after save
        _id: mockBoardId,
        title: 'Board with Pins',
        pins: [...pinsAfterRemoval],
      };
      // The save method on the instance resolves with the board's new state
      boardInstanceBeforeRemoval.save.mockResolvedValue(boardJsonAfterRemoval);
      Board.findById.mockResolvedValue(boardInstanceBeforeRemoval);

      const response = await request(app).delete(`/boards/${mockBoardId}/pins/${mockPinIdToRemove}`);

      expect(response.status).toBe(200);
      // Route logic mutates boardInstanceBeforeRemoval.pins
      expect(boardInstanceBeforeRemoval.pins).toEqual(pinsAfterRemoval);
      expect(boardInstanceBeforeRemoval.save).toHaveBeenCalled();
      expect(response.body).toEqual(boardJsonAfterRemoval);
      expect(Board.findById).toHaveBeenCalledWith(mockBoardId);
    });

    it('should return the board as is if pin to remove is not on the board (save is still called)', async () => {
        const mockBoardId = 'board1';
        const mockPinIdToRemove = 'nonExistentPin';
        const initialPins = ['pin123', 'pin789'];

        const boardInstanceWithSave = { // Instance from findById
          _id: mockBoardId,
          title: 'Board with Pins',
          pins: [...initialPins],
          save: jest.fn(),
        };
        const expectedJsonAfterSave = { // Expected JSON after save (pins array unchanged by filter)
            _id: mockBoardId,
            title: 'Board with Pins',
            pins: [...initialPins],
        };
        // Save resolves, reflecting that the pins array (on the instance that save returns) wasn't changed by the filter
        boardInstanceWithSave.save.mockResolvedValue(expectedJsonAfterSave);
        Board.findById.mockResolvedValue(boardInstanceWithSave);

        const response = await request(app).delete(`/boards/${mockBoardId}/pins/${mockPinIdToRemove}`);

        expect(response.status).toBe(200);
        // The pins array on the mock instance was filtered, but the filter didn't remove anything.
        expect(boardInstanceWithSave.pins).toEqual(initialPins);
        expect(boardInstanceWithSave.save).toHaveBeenCalled();
        expect(response.body).toEqual(expectedJsonAfterSave); // Response reflects the saved state
        expect(Board.findById).toHaveBeenCalledWith(mockBoardId);
      });

    it('should return 404 if board not found when removing a pin', async () => {
      const mockBoardId = 'nonexistentboard';
      const mockPinId = 'pin123';
      Board.findById.mockResolvedValue(null);

      const response = await request(app).delete(`/boards/${mockBoardId}/pins/${mockPinId}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Board not found' });
    });

    it('should return 500 if server error when removing a pin (e.g. findById fails)', async () => {
      const mockBoardId = 'board1';
      const mockPinId = 'pin123';
      Board.findById.mockRejectedValue(new Error('DB find error'));

      const response = await request(app).delete(`/boards/${mockBoardId}/pins/${mockPinId}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Server error' });
      expect(console.error).toHaveBeenCalledWith('Remove pin from board error:', expect.any(Error));
    });

    it('should return 500 if server error when removing a pin (e.g. save fails)', async () => {
        const mockBoardId = 'board1';
        const mockPinId = 'pin123';
        const boardInstance = { // Instance from findById
            _id: mockBoardId,
            title: 'Board with Pins',
            pins: [mockPinId, 'otherPin'],
            save: jest.fn().mockRejectedValue(new Error('DB save error')),
        };
        Board.findById.mockResolvedValue(boardInstance);

        const response = await request(app).delete(`/boards/${mockBoardId}/pins/${mockPinId}`);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Server error' });
        expect(console.error).toHaveBeenCalledWith('Remove pin from board error:', expect.any(Error));
        expect(boardInstance.save).toHaveBeenCalled(); // Save was attempted
      });
  });
});