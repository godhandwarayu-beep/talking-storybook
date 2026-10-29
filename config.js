/* School settings. Fill SERVER after deploying apps-script/Code.gs as a web app,
   so every student device connects automatically without any setup. */
window.TSB_CONFIG = {
  SERVER: '',         // e.g. 'https://script.google.com/macros/s/XXXX/exec'
  // teacher code, stored only as a SHA-256 fingerprint (salt 'tsb-teacher-v1|' + code); the code itself is never in this file
  TEACHER_CODE_SHA256: 'cc6219cb6852233927f41adf5fc9a649666414765d0ccaad167d5a02e7888f00'
};
