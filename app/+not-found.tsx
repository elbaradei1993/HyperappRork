import { Stack, useRouter } from "expo-router";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Home, AlertCircle } from "lucide-react-native";
import { useEffect } from "react";

export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after 3 seconds if the page is not found
    const timer = setTimeout(() => {
      router.replace("/");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ title: "Page Not Found", headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.content}>
          <AlertCircle size={64} color="#ff4757" style={styles.icon} />
          <Text style={styles.title}>Oops! Page Not Found</Text>
          <Text style={styles.subtitle}>The page you&apos;re looking for doesn&apos;t exist.</Text>
          <Text style={styles.redirectText}>Redirecting to home in 3 seconds...</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace("/")}
            activeOpacity={0.8}
          >
            <Home size={20} color="#fff" />
            <Text style={styles.buttonText}>Go Home Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#8e8e93",
    marginBottom: 8,
    textAlign: "center",
  },
  redirectText: {
    fontSize: 14,
    color: "#ff4757",
    marginBottom: 32,
    textAlign: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ff4757",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
