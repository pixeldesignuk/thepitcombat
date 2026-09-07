export function getWaitlistConfig(env = {}) {
  const config = {
    enabled: true,
    operatorName: (env.OPERATOR_NAME || '').trim(),
    privacyEmail: (env.PRIVACY_EMAIL || '').trim(),
    correspondenceAddress: (env.CORRESPONDENCE_ADDRESS || '').trim(),
  };
  return config;
}

export function encodeSubmission(formData) {
  const allowed = ['submissionId', 'name', 'email', 'phone', 'programme', 'consent', 'website'];
  const body = new URLSearchParams();
  for (const key of allowed) {
    const value = formData.get(key);
    if (typeof value === 'string') body.set(key, value);
  }
  return body.toString();
}
