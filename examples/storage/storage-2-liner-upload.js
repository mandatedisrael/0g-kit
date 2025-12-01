import { uploadFile } from '../../dist/index.js';

  const result = await uploadFile(filePath);
  console.log('File uploaded. Root hash:', result.rootHash);
