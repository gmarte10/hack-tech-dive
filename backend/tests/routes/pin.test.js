const request = require('supertest');
const express = require('express');

// Update these paths to match your project structure
const router = require('../../routes/pins');
const Pin = require('../../models/Pin');

// Mock the Pin model
jest.mock('../../models/Pin');

// Create an Express application for testing
const app = express();
app.use(express.json());
app.use('/', router);

describe('Create Pin Endpoint', () => {
  // Clear all mock implementations and calls before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /', () => {
    it('should create a new pin successfully', async () => {
      // Mock data
      const pinData = {
        title: 'New Pin',
        description: 'New Description',
        imageUrl: 'new.jpg',
        userId: 'user123'
      };
      
      const savedPin = {
        _id: '123',
        title: 'New Pin',
        description: 'New Description',
        imageUrl: 'new.jpg',
        user: 'user123'
      };

      // Mock Pin constructor and save method
      Pin.mockImplementation(() => ({
        title: pinData.title,
        description: pinData.description,
        imageUrl: pinData.imageUrl,
        user: pinData.userId,
        save: jest.fn().mockResolvedValue(savedPin)
      }));

      // Make request
      const response = await request(app)
        .post('/')
        .send(pinData);

      // Assertions
      expect(response.status).toBe(201);
      // Use toMatchObject instead of toEqual to match a subset of properties
      expect(response.body).toMatchObject({
        title: savedPin.title,
        description: savedPin.description,
        imageUrl: savedPin.imageUrl,
        user: savedPin.user
      });
      expect(Pin).toHaveBeenCalledWith({
        title: pinData.title,
        description: pinData.description,
        imageUrl: pinData.imageUrl,
        user: pinData.userId
      });
    });

    it('should handle server errors during pin creation', async () => {
      // Mock data
      const pinData = {
        title: 'New Pin',
        description: 'New Description',
        imageUrl: 'new.jpg',
        userId: 'user123'
      };

      // Mock Pin constructor and save method to throw an error
      Pin.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      }));

      // Mock console.error
      console.error = jest.fn();

      // Make request
      const response = await request(app)
        .post('/')
        .send(pinData);

      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Server error' });
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      // Mock data with missing fields
      const incompleteData = {
        // Missing title and description
        imageUrl: 'new.jpg',
        userId: 'user123'
      };

      // Mock Pin constructor and save method to throw a validation error
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      
      Pin.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(validationError)
      }));

      // Mock console.error
      console.error = jest.fn();

      // Make request
      const response = await request(app)
        .post('/')
        .send(incompleteData);

      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Server error' });
      expect(console.error).toHaveBeenCalledWith('Create pin error:', expect.any(Error));
    });
  });
});