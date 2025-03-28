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
  profilePicture?: string;
  testAuthorizationStatus?:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'not_submitted';
  testAuthorizationDate?: string | Date;
  testEligibilityInfo?: {
    jobPosition: string;
    company: string;
    department?: string;
    additionalInfo?: string;
    submissionDate?: string | Date;
  };
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

export interface TestAuthorizationRequest {
  jobPosition: string;
  company: string;
  department?: string;
  additionalInfo?: string;
  // Optional user profile updates
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | Date;
  gender?: string;
  currentPosition?: string;
  desiredPosition?: string;
  educationLevel?: string;
}

export interface TestAuthorizationRequestsResponse {
  success: boolean;
  requests: User[];
  pagination: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}
