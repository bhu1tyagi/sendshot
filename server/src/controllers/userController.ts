import { Request, Response } from 'express';
import supabase from '../db/supabase';
import { User, UserModel } from '../db/models/user';

// Create an instance of UserModel
const userModel = new UserModel(supabase);

export async function createOrUpdateUser(req: Request, res: Response) {
  try {
    const { userId, username, provider } = req.body;
    
    // Validate required fields
    if (!userId || !provider) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId, provider' 
      });
    }
    
    // Check if user already exists
    const existingUser = await userModel.findById(userId);
    
    let user: User;
    
    if (existingUser) {
      // Update existing user
      user = await userModel.updateUser(userId, {
        username: username || existingUser.username,
        provider,
        last_login: new Date().toISOString(),
      });
    } else {
      // Create new user
      user = await userModel.createUser({
        id: userId,
        username: username || userId.substring(0, 6),
        provider,
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      user: {
        id: user.id,
        username: user.username,
        provider: user.provider,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      } 
    });
  } catch (error: any) {
    console.error('Error in createOrUpdateUser:', error);
    // Check for the specific error related to missing table
    if (error?.message?.includes('relation "users" does not exist')) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database table not found. Please run migrations to set up the database.',
        details: 'The users table does not exist. Check server logs for migration instructions.' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Server error creating/updating user',
      message: error.message 
    });
  }
}

export async function getUserProfile(req: Request, res: Response) {
  try {
    const { userId } = req.query;
    
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameter: userId'
      });
    }
    
    // Fetch user from database using model
    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      url: user.profile_pic_url,
      username: user.username,
      description: user.description,
      attachmentData: user.attachment_data || {}
    });
  } catch (error: any) {
    console.error('Error in getUserProfile:', error);
    // Check for the specific error related to missing table
    if (error?.message?.includes('relation "users" does not exist')) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database table not found. Please run migrations to set up the database.',
        details: 'The users table does not exist. Check server logs for migration instructions.' 
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Server error fetching user profile',
      message: error.message
    });
  }
}

export async function updateUsername(req: Request, res: Response) {
  try {
    const { userId, username } = req.body;
    
    if (!userId || !username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, username'
      });
    }
    
    // Update username using model
    const updatedUser = await userModel.updateUser(userId, { username });
    
    return res.status(200).json({
      success: true,
      username: updatedUser.username
    });
  } catch (error: any) {
    console.error('Error in updateUsername:', error);
    // Check for the specific error related to missing table
    if (error?.message?.includes('relation "users" does not exist')) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database table not found. Please run migrations to set up the database.' 
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Server error updating username',
      message: error.message
    });
  }
}

export async function updateDescription(req: Request, res: Response) {
  try {
    const { userId, description } = req.body;
    
    if (!userId || description === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, description'
      });
    }
    
    // Update description using model
    const updatedUser = await userModel.updateUser(userId, { description });
    
    return res.status(200).json({
      success: true,
      description: updatedUser.description
    });
  } catch (error: any) {
    console.error('Error in updateDescription:', error);
    // Check for the specific error related to missing table
    if (error?.message?.includes('relation "users" does not exist')) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database table not found. Please run migrations to set up the database.' 
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Server error updating description',
      message: error.message
    });
  }
}

export async function deleteAccount(req: Request, res: Response) {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: userId'
      });
    }
    
    // Delete user using model
    await userModel.deleteUser(userId);
    
    return res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error: any) {
    console.error('Error in deleteAccount:', error);
    // Check for the specific error related to missing table
    if (error?.message?.includes('relation "users" does not exist')) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database table not found. Please run migrations to set up the database.' 
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Server error deleting account',
      message: error.message
    });
  }
} 