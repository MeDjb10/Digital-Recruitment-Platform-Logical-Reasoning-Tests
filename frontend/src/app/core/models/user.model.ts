export interface User {
  id: string; // Use id consistently across the application
  _id?: string; 
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  dateOfBirth?: string | Date;
  gender?: string;
  currentPosition?: string;
  desiredPosition?: string;
  educationLevel?: string;
  status?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface UserResponse {
  success: boolean;
  user: User;
  message?: string;
}

export interface UsersResponse {
  success: boolean;
  users: User[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}
