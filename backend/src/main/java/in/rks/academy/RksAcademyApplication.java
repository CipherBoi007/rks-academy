package in.rks.academy;

import in.rks.academy.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class RksAcademyApplication {

    public static void main(String[] args) {
        SpringApplication.run(RksAcademyApplication.class, args);
    }
}
