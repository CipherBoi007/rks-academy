package in.rks.academy.product;

import in.rks.academy.common.ApiException;
import in.rks.academy.common.PageResponse;
import in.rks.academy.product.ProductDtos.ProductDto;
import in.rks.academy.product.ProductDtos.ProductRequest;
import in.rks.academy.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "Store")
@Validated
@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService products;

    public ProductController(ProductService products) {
        this.products = products;
    }

    @GetMapping
    public PageResponse<ProductDto> search(@RequestParam(required = false) String q,
                                           @RequestParam(required = false) Product.Category category,
                                           @RequestParam(defaultValue = "false") boolean includeInactive,
                                           @RequestParam(defaultValue = "0") @Min(0) int page,
                                           @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size) {
        // Archived products are an owner's back-office view only.
        return products.search(q, category, includeInactive && CurrentUser.get().isOwner(), page, size);
    }

    @GetMapping("/{id}")
    public ProductDto get(@PathVariable long id) {
        ProductDto product = products.get(id);
        if (!product.active() && !CurrentUser.get().isOwner()) {
            throw ApiException.notFound("Product", id); // archived items exist only for the owner
        }
        return product;
    }

    @GetMapping("/{id}/related")
    public List<ProductDto> related(@PathVariable long id,
                                    @RequestParam(defaultValue = "4") @Min(1) @Max(12) int limit) {
        return products.related(id, limit);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductDto create(@Valid @RequestBody ProductRequest req) {
        return products.create(req);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PutMapping("/{id}")
    public ProductDto update(@PathVariable long id, @Valid @RequestBody ProductRequest req) {
        return products.update(id, req);
    }

    @PreAuthorize("hasRole('OWNER')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable long id) {
        products.archive(id);
    }

    @PreAuthorize("hasRole('OWNER')")
    @PostMapping("/{id}/restore")
    public ProductDto restore(@PathVariable long id) {
        return products.restore(id);
    }

    public record ImageUrl(String url) {
    }

    @Operation(summary = "Upload a product photo (JPG, PNG or WebP, up to 2 MB); returns its URL")
    @PreAuthorize("hasRole('OWNER')")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ImageUrl uploadImage(@RequestPart("file") MultipartFile file) {
        return new ImageUrl(products.uploadImage(file));
    }
}
