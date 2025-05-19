import { StyleSheet } from "react-native";
import COLORS from "@/assets/colors";
import TYPOGRAPHY from "@/assets/typography";

export const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between", // Changed from flex-start to space-between
    alignItems: "center",
    width: "100%", // Ensure container takes full width
    gap: 12,
  },
  btn: {
    position: "relative" as const,
    backgroundColor: COLORS.lighterBackground,
    height: 40,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    flex: 1, // Make buttons grow equally to fill space
    borderWidth: 1,
    borderColor: COLORS.borderDarkColor,
  },
  fullWidthBtn: {
    width: "100%",
  },
  text: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.fontWeightToString(TYPOGRAPHY.semiBold),
    textAlign: "center", // Ensure text is centered
  },
});
