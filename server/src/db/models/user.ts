import { SupabaseClient } from '@supabase/supabase-js';

export interface User {
  id: string;
  username: string;
  provider: string;
  created_at: string;
  last_login: string;
  profile_pic_url?: string;
  description?: string;
  attachment_data?: Record<string, any>;
}

export class UserModel {
  private supabase: SupabaseClient;
  private tableName = 'users';

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }
    
    return data as User;
  }

  async createUser(user: Omit<User, 'created_at' | 'last_login'> & { created_at?: string, last_login?: string }): Promise<User> {
    const now = new Date().toISOString();
    
    const userData = {
      ...user,
      created_at: user.created_at || now,
      last_login: user.last_login || now,
    };
    
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([userData])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as User;
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        ...updates,
        last_login: updates.last_login || new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data as User;
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
  }
} 