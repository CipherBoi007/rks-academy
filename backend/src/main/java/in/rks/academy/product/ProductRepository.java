package in.rks.academy.product;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    Optional<Product> findFirstByAdvertisedTrueAndActiveTrueAndAdPlacementOrderBySortOrderAsc(
            Product.AdPlacement placement);

    @Query("""
            select p from Product p
            where p.active = true and p.id <> :id and (p.category = :category or p.brand = :brand)
            order by case when p.category = :category then 0 else 1 end, p.sortOrder
            """)
    List<Product> findRelated(Long id, Product.Category category, String brand, Pageable pageable);

    @Query("select coalesce(max(p.sortOrder), 0) from Product p")
    int maxSortOrder();
}
