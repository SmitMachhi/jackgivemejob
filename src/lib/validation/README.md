# Video Validation Pipeline

This comprehensive video validation pipeline ensures uploaded videos meet all requirements before processing.

## Features

### 1. File Size Validation
- Maximum file size: 50MB
- Minimum file size: 1KB
- Supported formats: MP4, MOV, AVI, MKV, WEBM

### 2. Video Duration Validation
- Maximum duration: 10.2 seconds
- Minimum duration: 1 second

### 3. Audio Track Detection
- Validates presence of audio track
- Checks audio format compatibility

### 4. Language Detection
- Uses Whisper API for language detection
- Supports: English, Vietnamese, Hindi, French, Spanish
- Confidence scoring for reliability

### 5. Language-Specific Rules
- Custom validation rules per language
- Different confidence thresholds
- Regional format support

## Usage

### Basic Validation

```typescript
import { VideoValidator } from '@/lib/validation/video-validator';

const validator = new VideoValidator(process.env.OPENAI_API_KEY);
const result = await validator.validateVideo(file);
```

### Advanced Validation with Language Detection

```typescript
const result = await validator.validateVideo(file, {
  targetLanguage: 'en',
  enableLanguageDetection: true,
  strictMode: true
});
```

### Upload Route Integration

The video validator is integrated into the upload route at `/api/upload/route.ts`. You can send videos with additional parameters:

```javascript
const formData = new FormData();
formData.append('file', videoFile);
formData.append('targetLanguage', 'en');
formData.append('enableLanguageDetection', 'true');

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});
```

## Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_FILE_TYPE` | Unsupported file format |
| `FILE_TOO_LARGE` | File exceeds 50MB limit |
| `FILE_TOO_SMALL` | File is too small |
| `VIDEO_TOO_LONG` | Video exceeds 10.2s limit |
| `VIDEO_TOO_SHORT` | Video is shorter than 1s |
| `NO_AUDIO_TRACK` | No audio detected |
| `INVALID_AUDIO_FORMAT` | Unsupported audio format |
| `LANGUAGE_NOT_SUPPORTED` | Language not supported |
| `LANGUAGE_DETECTION_FAILED` | Failed to detect language |
| `PROCESSING_ERROR` | General processing error |
| `CORRUPTED_FILE` | File appears corrupted |
| `INVALID_FORMAT` | Invalid video format |

## Language Support

### Supported Languages
- **English** (en): Standard validation rules
- **Vietnamese** (vi): Lower confidence threshold (0.6)
- **Hindi** (hi): Lower confidence threshold (0.6)
- **French** (fr): Standard validation rules
- **Spanish** (es): Standard validation rules

### Language-Specific Rules
Each language has specific validation rules:
- Duration limits
- File size limits
- Minimum confidence thresholds
- Supported formats

## Response Format

### Successful Validation
```json
{
  "success": true,
  "data": {
    "upload": { /* blob storage result */ },
    "validation": {
      "isValid": true,
      "metadata": {
        "duration": 8.5,
        "hasVideo": true,
        "hasAudio": true,
        "resolution": { "width": 1920, "height": 1080 },
        "format": "mp4",
        "size": 25000000
      },
      "languageDetection": {
        "language": "en",
        "confidence": 0.85,
        "detectedText": "Sample text"
      },
      "warnings": ["Low resolution detected"],
      "processingTime": 1500
    },
    "totalProcessingTime": 2500
  }
}
```

### Validation Failed
```json
{
  "error": "Video validation failed",
  "code": "VALIDATION_FAILED",
  "details": {
    "errors": [
      {
        "code": "FILE_TOO_LARGE",
        "message": "File size exceeds 50MB limit",
        "details": {
          "size": 60000000,
          "maxSize": 52428800,
          "maxSizeMB": 50
        }
      }
    ],
    "warnings": [],
    "processingTime": 500
  }
}
```

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Required for language detection

### FFmpeg Integration
- Uses `fluent-ffmpeg` for video processing
- Requires `ffmpeg-static` binary
- Configurable timeout settings

## Testing

Run the test suite:
```bash
npm test src/lib/validation/video-validator.test.ts
```

## Logging

The validator provides comprehensive logging:
```typescript
const validator = new VideoValidator(
  process.env.OPENAI_API_KEY,
  (message, data) => {
    console.log(`[VideoValidator] ${message}`, data);
  }
);
```

## Performance Considerations

- Timeout: 30 seconds for metadata extraction
- Memory usage: Optimized for large files
- Parallel processing: Single file at a time
- Caching: No caching implemented (consider adding for frequently validated files)

## Error Handling

The validator provides detailed error information:
- Specific error codes for programmatic handling
- User-friendly error messages
- Detailed technical information for debugging
- Warning messages for non-critical issues

## Security

- File type validation prevents malicious uploads
- Size limits prevent DoS attacks
- Secure processing of sensitive media
- No persistent storage of uploaded content during validation