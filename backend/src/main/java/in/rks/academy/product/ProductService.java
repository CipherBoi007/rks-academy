package in.rks.academy.product;

import in.rks.academy.common.ApiException;
import in.rks.academy.common.FileStorageService;
import in.rks.academy.common.PageResponse;
import in.rks.academy.product.ProductDtos.ProductDto;
import in.rks.academy.product.ProductDtos.ProductRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository products;
    private final FileStorageService files;

    public ProductService(ProductRepository products, FileStorageService files) {
        this.products = products;
        this.files = files;
    }

    public PageResponse<ProductDto> search(String q, Product.Category category, boolean includeInactive, int page,
                                           int size) {
        Specification<Product> spec = (root, query, cb) -> includeInactive ? cb.conjunction()
                : cb.isTrue(root.get("active"));
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("brand")), like)));
        }
        if (category != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), category));
        }
        var pageable = PageRequest.of(page, size, Sort.by("sortOrder", "id"));
        return PageResponse.of(products.findAll(spec, pageable), ProductDto::of);
    }

    public ProductDto get(long id) {
        return ProductDto.of(load(id));
    }

    /** Same category first, then same brand. */
    public List<ProductDto> related(long id, int limit) {
        Product p = load(id);
        return products.findRelated(id, p.getCategory(), p.getBrand(), PageRequest.of(0, limit)).stream()
                .map(ProductDto::of).toList();
    }

    public Optional<ProductDto> ad(Product.AdPlacement placement) {
        return products.findFirstByAdvertisedTrueAndActiveTrueAndAdPlacementOrderBySortOrderAsc(placement)
                .map(ProductDto::of);
    }

    @Transactional
    public ProductDto create(ProductRequest req) {
        Product p = new Product();
        p.setSortOrder(products.maxSortOrder() + 1);
        apply(p, req);
        return ProductDto.of(products.save(p));
    }

    @Transactional
    public ProductDto update(long id, ProductRequest req) {
        Product p = load(id);
        apply(p, req);
        return ProductDto.of(p);
    }

    @Transactional
    public void archive(long id) {
        Product p = load(id);
        p.setActive(false);
        p.setAdvertised(false);
    }

    @Transactional
    public ProductDto restore(long id) {
        Product p = load(id);
        p.setActive(true);
        return ProductDto.of(p);
    }

    @Transactional
    public String uploadImage(MultipartFile file) {
        return files.store(FileStorageService.Kind.PRODUCT_IMAGE, "product", file);
    }

    private Product load(long id) {
        return products.findById(id).orElseThrow(() -> ApiException.notFound("Product", id));
    }

    private static void apply(Product p, ProductRequest req) {
        if (req.price().compareTo(req.mrp()) > 0) {
            throw ApiException.rule("PRICE_ABOVE_MRP", "Price can't be more than the MRP");
        }
        if (req.advertised() && req.adPlacement() == null) {
            throw ApiException.rule("AD_PLACEMENT_REQUIRED", "Pick where the ad should appear");
        }
        p.setBrand(req.brand().trim());
        p.setCategory(req.category());
        p.setName(req.name().trim());
        p.setDescription(req.description());
        p.setPrice(req.price());
        p.setMrp(req.mrp());
        p.setRating(req.rating());
        p.setReviewCount(req.reviewCount());
        p.setStock(req.stock());
        p.setTagLabel(req.tagLabel() == null || req.tagLabel().isBlank() ? null : req.tagLabel().trim());
        p.setImages(new ArrayList<>(req.images()));
        p.setSpecs(new ArrayList<>(req.specs().stream().map(s -> new Product.Spec(s.label(), s.value())).toList()));
        p.setVariants(new ArrayList<>(req.variants().stream()
                .map(v -> new Product.Variant(v.group(), v.value())).toList()));
        p.setAdvertised(req.advertised());
        p.setAdPlacement(req.advertised() ? req.adPlacement() : null);
        p.setAdHeadline(req.adHeadline());
        p.setAdHighlight(req.adHighlight());
        p.setAdCopy(req.adCopy());
        p.setAdImage(req.adImage());
    }
}
