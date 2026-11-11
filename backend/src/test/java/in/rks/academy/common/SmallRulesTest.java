package in.rks.academy.common;

import static org.assertj.core.api.Assertions.assertThat;

import in.rks.academy.auth.PinPolicy;
import java.math.BigDecimal;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

class SmallRulesTest {

    @ParameterizedTest
    @CsvSource({
            "0, Rupees Zero Only",
            "1500, Rupees One Thousand Five Hundred Only",
            "15000, Rupees Fifteen Thousand Only",
            "4200, Rupees Four Thousand Two Hundred Only",
            "125000, Rupees One Lakh Twenty Five Thousand Only",
            "12345678, Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only",
            "3780.50, Rupees Three Thousand Seven Hundred Eighty and Fifty Paise Only"})
    void rupeesInWords(String amount, String words) {
        assertThat(IndianRupeeWords.of(new BigDecimal(amount))).isEqualTo(words);
    }

    @ParameterizedTest
    @CsvSource({"Aravind Murugan, AM", "R. Sethupathi, RS", "Mohammed Irfan, MI", "Divya, D", "A B C, AC"})
    void initials(String name, String expected) {
        assertThat(Names.initials(name)).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {"1234", "0000", "9999", "123456", "4321", "5678", "987654", "000000", "121212",
            "1234567890", "987654321", "112233"})
    void weakPins(String pin) {
        assertThat(PinPolicy.isWeak(pin)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"4729", "1357", "802615", "2468", "730519", "58203917"})
    void acceptablePins(String pin) {
        assertThat(PinPolicy.isWeak(pin)).isFalse();
    }
}
