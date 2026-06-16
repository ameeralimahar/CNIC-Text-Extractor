export interface CandidateSearchResult {
  applicationId: string;
  fullName: string;
  projectName: string;
  appliedFor: string;
  appliedOn: string;
  reviewStatus: string;
  paymentStatus: string;
}

export interface CandidateBasicInfo {
  applicationId: string;
  projectName: string;
  vacancyName: string;
  cnic: string;
  name: string;
  fatherName: string;
  dob: string;
  gender: string;
  disability: string;
  issueDate: string;
  expiryDate: string;
  cnicFrontUrl: string;
}

export interface VerificationResult {
  applicationId: string;
  candidate: CandidateBasicInfo;
  extracted: {
    cnic_number: string | null;
    dob: string | null;
    name: string | null;
    father_name: string | null;
    gender: string | null;
    issue_date: string | null;
    expiry_date: string | null;
  };
  comparison: {
    cnicMatch: boolean;
    dobMatch: boolean;
  };
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}
