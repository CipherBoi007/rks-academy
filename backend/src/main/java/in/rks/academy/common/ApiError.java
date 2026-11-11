package in.rks.academy.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(int status, String code, String message, List<FieldError> fieldErrors, String path,
                       Instant timestamp) {

    public record FieldError(String field, String message) {
    }

    public static ApiError of(int status, String code, String message, String path) {
        return new ApiError(status, code, message, List.of(), path, Instant.now());
    }
}
