const BASE = 'http://localhost:4000/api';

// Minimal valid 2x2 PNG.
const pngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP8z8Dwn4EIwDiqEAAj0QMFAA0GAAG3P6qOAAAAAElFTkSuQmCC';
const pngBytes = Buffer.from(pngBase64, 'base64');

async function main() {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@carguy.app', password: 'User123!' }),
  }).then((r) => r.json());
  const token = login.data.accessToken;
  console.log('Logged in:', login.data.user.email);

  const form = new FormData();
  form.append('file', new Blob([pngBytes], { type: 'image/png' }), 'test.png');

  const up = await fetch(`${BASE}/uploads/local`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const upJson = await up.json();
  console.log('Upload status:', up.status);
  console.log('Upload result:', JSON.stringify(upJson));

  const url = upJson.data?.url;
  if (!url) {
    console.log('NO URL RETURNED');
    process.exit(1);
  }

  const fetched = await fetch(url);
  console.log('Fetch uploaded file status:', fetched.status, 'content-type:', fetched.headers.get('content-type'));

  // Create a story with the uploaded file
  const story = await fetch(`${BASE}/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mediaUrl: url, type: 'IMAGE', caption: 'Uploaded from device' }),
  });
  console.log('Create story status:', story.status);

  process.exit(up.status === 201 && fetched.status === 200 && story.status === 201 ? 0 : 1);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
