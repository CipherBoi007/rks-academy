package in.rks.academy.family;

/** A signed-in parent. Every family endpoint is limited to the active players with this mobile number. */
public record FamilyPrincipal(long accountId, String mobile) {
}
