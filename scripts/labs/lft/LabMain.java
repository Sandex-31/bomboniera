import java.io.*;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;

/** Demo driver, not part of the course project: runs the handed-in Translator, then Jasmin,
 *  then the generated Output, with absolute paths so it works inside CheerpJ's file system.
 *  args[0] is a path prefix for text.txt and input.txt, args[1] a writable directory. */
public class LabMain {
    /** One line per read and nothing "available": Output.read() makes a new Scanner each time,
     *  and a Scanner that buffered the whole input would leave nothing for the next one. */
    static class LineAtATime extends InputStream {
        private final InputStream in;
        LineAtATime(InputStream in) { this.in = in; }
        @Override public int read() throws IOException { return in.read(); }
        @Override public int available() { return 0; }
        @Override public int read(byte[] b, int off, int len) throws IOException {
            int n = 0;
            while (n < len) {
                int c = in.read();
                if (c < 0) return n == 0 ? -1 : n;
                b[off + n++] = (byte) c;
                if (c == '\n') break;
            }
            return n;
        }
    }

    public static void main(String[] args) throws Exception {
        String in = args[0], work = args[1];
        new File(work).mkdirs();
        // CodeGenerator writes "Output.j" relative to the working directory: the process's own
        // on a real JVM, /files/ inside CheerpJ whatever user.dir says. CheerpJ keeps /files/
        // across visits, so anything left by an earlier run goes first.
        File j = new File(work + "Output.j");
        File[] written = { new File("Output.j").getAbsoluteFile(), new File("/files/Output.j") };
        for (File stale : new File[] { j, new File(work + "Output.class"), written[0], written[1] }) stale.delete();
        PrintStream out = new PrintStream(new FileOutputStream(work + "out.txt"), true);
        System.setOut(out);
        System.setErr(out);
        try {
            new Translator(new Lexer(), new BufferedReader(new FileReader(in + "text.txt"))).prog();
            out.println("Input OK");
        } catch (Error e) {
            out.println("ERRORE " + e.getMessage());
            return;
        } catch (RuntimeException e) {
            // the Lexer returns null on a character it does not know, and the parser trips on it
            out.println("ERRORE " + e);
            return;
        }
        for (File w : written) if (!j.exists() && w.exists()) copy(w, j);
        // Jasmin prints "Generated: ..." on stdout; keep out.txt for the program's own output
        ByteArrayOutputStream jasminLog = new ByteArrayOutputStream();
        System.setOut(new PrintStream(jasminLog, true));
        jasmin.Main.main(new String[] { "-d", work, j.getPath() });
        System.setOut(out);
        if (!new File(work + "Output.class").exists()) {
            out.println("ERRORE jasmin: " + jasminLog.toString().trim());
            return;
        }
        System.setIn(new LineAtATime(new FileInputStream(in + "input.txt")));
        try (URLClassLoader cl = new URLClassLoader(new URL[] { new File(work).toURI().toURL() })) {
            Method m = cl.loadClass("Output").getMethod("main", String[].class);
            m.invoke(null, (Object) new String[0]);
        } catch (InvocationTargetException e) {
            out.println("ERRORE " + e.getCause());
        }
    }

    static void copy(File from, File to) throws IOException {
        try (InputStream i = new FileInputStream(from); OutputStream o = new FileOutputStream(to)) {
            byte[] buf = new byte[8192];
            for (int n; (n = i.read(buf)) > 0; ) o.write(buf, 0, n);
        }
    }
}
