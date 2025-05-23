const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function testPasswordFlow() {
  try {
    console.log('==== DEBUGGING PASSWORD FLOW ====');
    
    // Generate test password
    const testPassword = 'Password123!';
    console.log(`Test password: ${testPassword}`);
    
    // Hash password using bcrypt (same as in pre-save hook)
    console.log('\nHashing password (simulating signup)...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testPassword, salt);
    console.log(`Generated hash: ${hashedPassword}`);
    
    // Try to verify the password (simulating login)
    console.log('\nVerifying password (simulating login)...');
    const isMatch = await bcrypt.compare(testPassword, hashedPassword);
    console.log(`Password verification result: ${isMatch}`);
    
    if (!isMatch) {
      console.error('ERROR: Password verification failed!');
    } else {
      console.log('SUCCESS: Password verification works correctly');
    }
    
    // Test slight variations to see if there's sensitivity
    console.log('\nTesting password with space at end...');
    const spaceResult = await bcrypt.compare(testPassword + ' ', hashedPassword);
    console.log(`Result with space: ${spaceResult}`);
    
    console.log('\nTesting password with different case...');
    const caseResult = await bcrypt.compare('password123!', hashedPassword);
    console.log(`Result with different case: ${caseResult}`);
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
testPasswordFlow();