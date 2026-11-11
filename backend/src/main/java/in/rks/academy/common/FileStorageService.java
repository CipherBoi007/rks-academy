package in.rks.academy.common;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stores uploaded images in PostgreSQL and serves them only to signed-in users. Keeping them in the database
 * (not on local disk) means they survive redeploys on hosts with throwaway disks, and are in every backup.
 * Files are checked by declared type, size and magic bytes, then saved under a random name.
 */
@Service
public class FileStorageService {

    /** The kinds of upload, each with its own URL prefix. */
    public enum Kind {
        PLAYER_PHOTO("players"), PRODUCT_IMAGE("products");

        private final String folder;

        Kind(String folder) {
            this.folder = folder;
        }

        public String folder() {
            return folder;
        }

        public String urlPrefix() {
            return "/api/v1/files/" + folder + "/";
        }
    }

    /** A stored image, ready to send. */
    public record StoredFile(String contentType, byte[] data) {
    }

    private static final long MAX_BYTES = 2 * 1024 * 1024;
    private static final Map<String, String> EXTENSIONS = Map.of(
            MediaType.IMAGE_JPEG_VALUE, "jpg", MediaType.IMAGE_PNG_VALUE, "png", "image/webp", "webp");

    private final JdbcTemplate jdbc;

    public FileStorageService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Saves an image and returns the URL it is served from. */
    public String store(Kind kind, String namePrefix, MultipartFile file) {
        String contentType = file.getContentType();
        String ext = contentType == null ? null : EXTENSIONS.get(contentType);
        if (ext == null) {
            throw ApiException.badRequest("UNSUPPORTED_FILE", "Upload a JPG, PNG or WebP image");
        }
        if (file.getSize() > MAX_BYTES) {
            throw ApiException.badRequest("FILE_TOO_LARGE", "Images must be 2 MB or smaller");
        }
        if (!looksLikeImage(file)) {
            throw ApiException.badRequest("UNSUPPORTED_FILE", "That file isn't a valid image");
        }
        String safePrefix = namePrefix.toLowerCase().replaceAll("[^a-z0-9]+", "-");
        String name = safePrefix + "-" + UUID.randomUUID() + "." + ext;
        try {
            jdbc.update("INSERT INTO stored_file (kind, name, content_type, data) VALUES (?, ?, ?, ?)",
                    kind.folder(), name, contentType, file.getBytes());
        } catch (IOException e) {
            throw new IllegalStateException("Could not read upload", e);
        }
        return kind.urlPrefix() + name;
    }

    public StoredFile load(Kind kind, String name) {
        if (!name.matches("[a-z0-9-]+\\.(jpg|png|webp)")) {
            throw ApiException.notFound("File", name);
        }
        List<StoredFile> found = jdbc.query(
                "SELECT content_type, data FROM stored_file WHERE kind = ? AND name = ?",
                (rs, i) -> new StoredFile(rs.getString(1), rs.getBytes(2)), kind.folder(), name);
        if (found.isEmpty()) {
            throw ApiException.notFound("File", name);
        }
        return found.get(0);
    }

    /** Removes a file this service stored; anything else (e.g. bundled demo images) is left alone. */
    public void deleteQuietly(Kind kind, String url) {
        if (url == null || !url.startsWith(kind.urlPrefix())) {
            return;
        }
        jdbc.update("DELETE FROM stored_file WHERE kind = ? AND name = ?",
                kind.folder(), url.substring(kind.urlPrefix().length()));
    }

    /** Checks magic bytes so a renamed non-image can't be stored as a photo. */
    private static boolean looksLikeImage(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            byte[] h = in.readNBytes(12);
            if (h.length < 12) {
                return false;
            }
            boolean jpg = (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8;
            boolean png = (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G';
            boolean webp = h[0] == 'R' && h[1] == 'I' && h[2] == 'F' && h[3] == 'F' && h[8] == 'W' && h[9] == 'E';
            return jpg || png || webp;
        } catch (IOException e) {
            return false;
        }
    }
}
