import { Component, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IamService } from '../service/iam.service';
import { AuthService } from '../../../core/services/auth.service';

interface Message {
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.css']
})
export class OnboardingComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  ssoEmail = '';
  ssoName = '';
  detectedRegion = '';

  // Chat conversation
  messages: Message[] = [];
  isBotTyping = false;

  // Answers object
  answers: { [key: string]: any } = {};

  // Current active step
  currentStepIndex = 0;

  // Custom input bindings
  textInput = '';
  selectedOption = '';

  // Doctor multi-field forms
  eduCollege = '';
  eduYear: number | null = null;
  eduRegNo = '';

  hasSpecializationOption: 'Yes' | 'No' | '' = '';
  specField = '';
  specYear: number | null = null;
  specCollege = '';
  specRegNo = '';

  docAwards = '';
  docExperience: number | null = null;
  selectedFileName = '';

  // Patient multi-field forms
  patientDob = '';
  patientGender = '';
  patientEmergName = '';
  patientEmergPhone = '';
  patientMedical = '';

  // Legal Consent
  acceptTerms = false;
  acceptPrivacy = false;

  constructor(
    private apiService: IamService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Retrieve SSO info
    this.ssoEmail = localStorage.getItem('sso_email') || '';
    this.ssoName = localStorage.getItem('sso_name') || '';

    if (!this.ssoEmail) {
      this.router.navigate(['/iam/login']);
      return;
    }

    // Auto-detect timezone/region
    try {
      this.detectedRegion = Intl.DateTimeFormat().resolvedOptions().timeZone || 'US/Eastern';
    } catch (e) {
      this.detectedRegion = 'US/Eastern';
    }

    // Load saved answers and steps
    const savedAnswers = localStorage.getItem('onboarding_answers');
    const savedStep = localStorage.getItem('onboarding_step');

    if (savedAnswers && savedStep !== null) {
      this.answers = JSON.parse(savedAnswers);
      this.currentStepIndex = parseInt(savedStep, 10);
      this.rebuildChatHistory();
    } else {
      this.startChatflow();
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  // List of all steps
  get steps(): any[] {
    const baseSteps = [
      { id: 'name', type: 'text', prompt: `What is your full name?`, key: 'name', default: this.ssoName },
      { id: 'region', type: 'region', prompt: `What region or country are you from? (We detected your timezone as shown below, but feel free to modify it)`, key: 'region', default: this.detectedRegion },
      { id: 'role', type: 'role', prompt: `Are you registering as a Patient or a Doctor?`, key: 'role' }
    ];

    if (this.answers['role'] === 'Doctor') {
      return [
        ...baseSteps,
        { id: 'doc_education', type: 'education', prompt: `What is your Higher Education qualification?`, key: 'education_level' },
        { id: 'doc_field', type: 'text', prompt: `What is your main qualification/education field? (e.g. General Medicine, Pediatrics)`, key: 'field_of_study', placeholder: 'e.g. General Medicine' },
        { id: 'doc_college', type: 'doc_college', prompt: `Where did you complete your education? Please enter your College name, Year of completion, and Registration number:`, key: 'edu_details' },
        { id: 'doc_has_spec', type: 'select', prompt: `Have you completed any specialization?`, key: 'has_specialization', options: ['Yes', 'No'] },
        ...(this.answers['has_specialization'] === 'Yes' ? [
          { id: 'doc_spec_details', type: 'doc_spec_details', prompt: `Please provide your specialization field, year of completion, college name, and registration number:`, key: 'specialization_details' }
        ] : []),
        { id: 'doc_awards', type: 'text_area', prompt: `List any awards, achievements, or recognition you have received:`, key: 'awards', placeholder: 'Awards and accolades...' },
        { id: 'doc_exp', type: 'number', prompt: `How many years of professional experience do you have?`, key: 'experience' },
        { id: 'doc_file', type: 'file', prompt: `Please upload your qualification certificate or medical license for verification:`, key: 'verification_document' },
        { id: 'consent', type: 'consent', prompt: `Lastly, please read and accept our Terms of Service and Privacy Policy:`, key: 'consent' }
      ];
    } else if (this.answers['role'] === 'Patient') {
      return [
        ...baseSteps,
        { id: 'pat_dob', type: 'date', prompt: `What is your Date of Birth?`, key: 'patient_dob' },
        { id: 'pat_gender', type: 'gender', prompt: `What is your gender?`, key: 'patient_gender' },
        { id: 'pat_emergency', type: 'pat_emergency', prompt: `Please enter emergency contact details (Name and Phone Number):`, key: 'emergency_contact' },
        { id: 'pat_medical', type: 'text_area', prompt: `List any medical conditions, current medications, or allergies you have (enter 'None' if none):`, key: 'medical_conditions', placeholder: 'Medical history...' },
        { id: 'consent', type: 'consent', prompt: `Lastly, please read and accept our Terms of Service and Privacy Policy:`, key: 'consent' }
      ];
    }

    return baseSteps;
  }

  startChatflow(): void {
    this.messages = [];
    this.isBotTyping = true;
    setTimeout(() => {
      this.isBotTyping = false;
      this.messages.push({
        sender: 'bot',
        text: `Hi ${this.ssoName || 'there'}! Welcome to SDS App. Let's get your profile set up using a quick chat!`,
        timestamp: new Date()
      });
      this.askCurrentQuestion();
    }, 1000);
  }

  askCurrentQuestion(): void {
    const currentStep = this.steps[this.currentStepIndex];
    if (!currentStep) return;

    this.isBotTyping = true;
    setTimeout(() => {
      this.isBotTyping = false;
      this.messages.push({
        sender: 'bot',
        text: currentStep.prompt,
        timestamp: new Date()
      });

      // Pre-populate input based on defaults
      if (currentStep.default && !this.answers[currentStep.key]) {
        if (currentStep.key === 'name') this.textInput = currentStep.default;
        if (currentStep.key === 'region') this.textInput = currentStep.default;
      } else {
        this.textInput = '';
      }

      this.saveStateToLocalStorage();
    }, 800);
  }

  // Re-generate chat log from answers
  rebuildChatHistory(): void {
    this.messages = [
      { sender: 'bot', text: `Welcome back! Let's resume your onboarding from where you left off.`, timestamp: new Date() }
    ];

    const currentSteps = this.steps;
    for (let i = 0; i < this.currentStepIndex; i++) {
      const step = currentSteps[i];
      if (!step) continue;

      this.messages.push({ sender: 'bot', text: step.prompt, timestamp: new Date() });

      const ans = this.answers[step.key];
      let userText = '';
      if (typeof ans === 'object') {
        userText = JSON.stringify(ans);
        if (step.id === 'doc_college') {
          userText = `${ans.college_name} (${ans.completion_year}), Reg: ${ans.registration_no}`;
        } else if (step.id === 'doc_spec_details') {
          userText = `${ans.field} at ${ans.college_name} (${ans.completion_year}), Reg: ${ans.registration_no}`;
        } else if (step.id === 'pat_emergency') {
          userText = `${ans.name} (Phone: ${ans.phone})`;
        }
      } else {
        userText = String(ans);
      }
      this.messages.push({ sender: 'user', text: userText, timestamp: new Date() });
    }

    // Ask the current question (the active step)
    const activeStep = currentSteps[this.currentStepIndex];
    if (activeStep) {
      this.messages.push({ sender: 'bot', text: activeStep.prompt, timestamp: new Date() });
    }
  }

  saveStateToLocalStorage(): void {
    localStorage.setItem('onboarding_answers', JSON.stringify(this.answers));
    localStorage.setItem('onboarding_step', this.currentStepIndex.toString());
  }

  // Submit Answer
  submitAnswer(): void {
    const currentStep = this.steps[this.currentStepIndex];
    if (!currentStep) return;

    let ansVal: any = null;
    let displayVal = '';

    // Handle each input type
    switch (currentStep.type) {
      case 'text':
      case 'region':
        if (!this.textInput.trim()) return;
        ansVal = this.textInput.trim();
        displayVal = ansVal;
        break;

      case 'role':
        if (!this.selectedOption) return;
        ansVal = this.selectedOption;
        displayVal = ansVal;
        break;

      case 'education':
        if (!this.selectedOption) return;
        ansVal = this.selectedOption;
        displayVal = ansVal;
        break;

      case 'select':
        if (!this.selectedOption) return;
        ansVal = this.selectedOption;
        displayVal = ansVal;
        break;

      case 'doc_college':
        if (!this.eduCollege.trim() || !this.eduYear || !this.eduRegNo.trim()) return;
        ansVal = {
          college_name: this.eduCollege.trim(),
          completion_year: this.eduYear,
          registration_no: this.eduRegNo.trim()
        };
        displayVal = `${ansVal.college_name} (${ansVal.completion_year}), Registration: ${ansVal.registration_no}`;
        break;

      case 'doc_spec_details':
        if (!this.specField.trim() || !this.specYear || !this.specCollege.trim() || !this.specRegNo.trim()) return;
        ansVal = {
          field: this.specField.trim(),
          completion_year: this.specYear,
          college_name: this.specCollege.trim(),
          registration_no: this.specRegNo.trim()
        };
        displayVal = `${ansVal.field} at ${ansVal.college_name} (${ansVal.completion_year}), Reg: ${ansVal.registration_no}`;
        break;

      case 'text_area':
        if (!this.textInput.trim()) return;
        ansVal = this.textInput.trim();
        displayVal = ansVal;
        break;

      case 'number':
        if (this.docExperience === null || this.docExperience < 0) return;
        ansVal = this.docExperience;
        displayVal = `${ansVal} years`;
        break;

      case 'file':
        if (!this.selectedFileName) return;
        ansVal = {
          file_name: this.selectedFileName,
          file_url: `https://mock-storage.local/uploads/${this.selectedFileName}`
        };
        displayVal = `Uploaded document: ${this.selectedFileName}`;
        break;

      case 'date':
        if (!this.patientDob) return;
        ansVal = this.patientDob;
        displayVal = ansVal;
        break;

      case 'gender':
        if (!this.selectedOption) return;
        ansVal = this.selectedOption;
        displayVal = ansVal;
        break;

      case 'pat_emergency':
        if (!this.patientEmergName.trim() || !this.patientEmergPhone.trim()) return;
        ansVal = {
          name: this.patientEmergName.trim(),
          phone: this.patientEmergPhone.trim()
        };
        displayVal = `Contact: ${ansVal.name} (Phone: ${ansVal.phone})`;
        break;

      case 'consent':
        if (!this.acceptTerms || !this.acceptPrivacy) return;
        ansVal = {
          terms_accepted: this.acceptTerms,
          privacy_accepted: this.acceptPrivacy,
          accepted_at: new Date()
        };
        displayVal = `Accepted Terms & Conditions and Privacy Policy.`;
        break;
    }

    // Save answer
    this.answers[currentStep.key] = ansVal;

    // Add user reply to messages list
    this.messages.push({
      sender: 'user',
      text: displayVal,
      timestamp: new Date()
    });

    // Reset input states
    this.textInput = '';
    this.selectedOption = '';

    // Move to next step
    this.currentStepIndex++;
    this.saveStateToLocalStorage();

    // Check if onboarding completed
    if (this.currentStepIndex >= this.steps.length) {
      this.completeOnboarding();
    } else {
      this.askCurrentQuestion();
    }
  }

  // Trigger file selection mock
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFileName = file.name;
    }
  }

  // Complete & trigger backend register SSO
  completeOnboarding(): void {
    this.isBotTyping = true;

    const registrationPayload = {
      email: this.ssoEmail,
      name: this.answers['name'] || this.ssoName,
      region: this.answers['region'] || this.detectedRegion,
      entity_type: this.answers['role'].toLowerCase(),
      onboarding_details: { ...this.answers }
    };

    setTimeout(() => {
      this.apiService.registerSSO(registrationPayload).subscribe({
        next: (res) => {
          this.isBotTyping = false;
          this.messages.push({
            sender: 'bot',
            text: `Perfect! Your profile is all set up. Setting up your workspace session...`,
            timestamp: new Date()
          });

          // Write credentials and navigate to dashboard
          setTimeout(() => {
            this.authService.setSession(res.token, res.user);
            this.authService.setOrg(null);

            // Clean localStorage
            localStorage.removeItem('sso_email');
            localStorage.removeItem('sso_name');
            localStorage.removeItem('onboarding_answers');
            localStorage.removeItem('onboarding_step');

            this.router.navigate(['/user-mgmt']);
          }, 1500);
        },
        error: (err) => {
          this.isBotTyping = false;
          this.messages.push({
            sender: 'bot',
            text: `Oops! There was an error completing your registration: ${err.error?.error || 'Unknown error'}. Let's try to complete it again.`,
            timestamp: new Date()
          });
          // Decrement step so they can click finish again
          this.currentStepIndex--;
          this.saveStateToLocalStorage();
        }
      });
    }, 1500);
  }

  // Jump/Reset flow helper for troubleshooting
  resetOnboarding(): void {
    localStorage.removeItem('onboarding_answers');
    localStorage.removeItem('onboarding_step');
    this.answers = {};
    this.currentStepIndex = 0;
    this.selectedFileName = '';
    this.eduCollege = '';
    this.eduYear = null;
    this.eduRegNo = '';
    this.hasSpecializationOption = '';
    this.specField = '';
    this.specYear = null;
    this.specCollege = '';
    this.specRegNo = '';
    this.docAwards = '';
    this.docExperience = null;
    this.patientDob = '';
    this.patientGender = '';
    this.patientEmergName = '';
    this.patientEmergPhone = '';
    this.patientMedical = '';
    this.acceptTerms = false;
    this.acceptPrivacy = false;
    this.startChatflow();
  }
}
