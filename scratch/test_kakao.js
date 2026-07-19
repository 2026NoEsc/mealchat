const KAKAO_REST_API_KEY = 'b51a4450b051767a839dbb9d78b12e83';
const lat = 37.5665;
const lng = 126.9780;
const keyword = '카페';

async function test() {
  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(keyword)}&x=${lng}&y=${lat}&radius=2000&sort=accuracy`;
    console.log('Fetching:', url);
    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    });
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Results count:', data.documents ? data.documents.length : 0);
    if (data.documents) {
      console.log('Top 3 results:');
      data.documents.slice(0, 3).forEach(d => {
        console.log(`- ${d.place_name} (${d.category_name})`);
      });
    } else {
      console.log('Response body:', data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
