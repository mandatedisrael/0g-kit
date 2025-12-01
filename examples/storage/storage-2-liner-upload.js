import { uploadFile } from '0g-kit/storage';

  const result = await uploadFile(filePath);
  console.log('File uploaded. Root hash:', result.rootHash);
