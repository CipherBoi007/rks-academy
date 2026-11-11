package in.rks.academy.setup;

import in.rks.academy.admin.AdminUser;
import in.rks.academy.admin.AdminUserRepository;
import in.rks.academy.auth.TemporaryPin;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * One-time production bootstrap, the only way to create the first OWNER outside dev:
 *
 * <pre>java -jar rks-academy.jar --setup-owner --name="R. Sethupathi" --mobile=9xxxxxxxxx</pre>
 *
 * It refuses to run if an owner already exists. It prints a random one-time PIN, and the owner must change
 * that PIN on first sign-in. The process exits when it finishes.
 */
@Component
public class OwnerSetupRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OwnerSetupRunner.class);

    private final AdminUserRepository users;
    private final PasswordEncoder encoder;
    private final TransactionTemplate tx;
    private final ConfigurableApplicationContext context;

    public OwnerSetupRunner(AdminUserRepository users, PasswordEncoder encoder, TransactionTemplate tx,
                            ConfigurableApplicationContext context) {
        this.users = users;
        this.encoder = encoder;
        this.tx = tx;
        this.context = context;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!args.containsOption("setup-owner")) {
            return;
        }
        int code = setUp(single(args, "name"), single(args, "mobile"));
        System.exit(SpringApplication.exit(context, (ExitCodeGenerator) () -> code));
    }

    /** Returns a process exit code: 0 when created, 1 when an owner already exists, 2 on bad input. */
    public int setUp(String name, String mobile) {
        if (name == null || name.isBlank() || mobile == null || !mobile.matches("\\d{10}")) {
            log.error("Usage: --setup-owner --name=\"Full Name\" --mobile=<10 digits>");
            return 2;
        }
        String pin = TemporaryPin.generate();
        Boolean created = tx.execute(status -> {
            if (users.existsByRole(AdminUser.Role.OWNER)) {
                return false;
            }
            AdminUser owner = new AdminUser();
            owner.setName(name.trim());
            owner.setMobile(mobile);
            owner.setRole(AdminUser.Role.OWNER);
            owner.setPinHash(encoder.encode(pin));
            owner.setMustChangePin(true);
            users.save(owner);
            return true;
        });
        if (!Boolean.TRUE.equals(created)) {
            log.error("An owner account already exists. Setup is one-time only; nothing was changed.");
            return 1;
        }
        // Printed straight to stdout, not the log, so the one-time PIN doesn't end up in log aggregation.
        System.out.println();
        System.out.println("Owner account created for " + mobile + ".");
        System.out.println("One-time PIN: " + pin + "   (you will be asked to change it on first sign-in)");
        System.out.println();
        return 0;
    }

    private static String single(ApplicationArguments args, String name) {
        List<String> values = args.getOptionValues(name);
        return values == null || values.isEmpty() ? null : values.get(0);
    }
}
