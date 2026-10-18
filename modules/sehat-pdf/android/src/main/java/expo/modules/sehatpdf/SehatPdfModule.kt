package expo.modules.sehatpdf

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Longest side of a rendered page, in pixels: sharp enough for small table text, small enough for memory. */
private const val MAX_PAGE_PIXELS = 2600

class SehatPdfModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SehatPdf")

    // Renders up to `maxPages` pages of a PDF (file:// or content:// URI) to JPEGs in the cache.
    AsyncFunction("renderPages") Coroutine { uri: String, scale: Double, maxPages: Int ->
      return@Coroutine withContext(Dispatchers.IO) { renderPages(uri, scale, maxPages) }
    }

    // Reads printed text in an image. Returns each line with its position, so tables can be rebuilt.
    AsyncFunction("recognizeText") Coroutine { uri: String ->
      return@Coroutine recognizeText(uri)
    }
  }

  private fun open(uri: String): ParcelFileDescriptor {
    val parsed = Uri.parse(uri)
    return if (parsed.scheme == "content") {
      context.contentResolver.openFileDescriptor(parsed, "r")
        ?: throw IllegalArgumentException("Could not open the file.")
    } else {
      ParcelFileDescriptor.open(File(parsed.path ?: uri), ParcelFileDescriptor.MODE_READ_ONLY)
    }
  }

  private fun renderPages(uri: String, scale: Double, maxPages: Int): List<String> {
    val out = mutableListOf<String>()
    open(uri).use { fd ->
      PdfRenderer(fd).use { renderer ->
        val count = minOf(renderer.pageCount, maxPages)
        for (i in 0 until count) {
          renderer.openPage(i).use { page ->
            val factor = minOf(scale, MAX_PAGE_PIXELS.toDouble() / maxOf(page.width, page.height))
            val width = maxOf(1, (page.width * factor).toInt())
            val height = maxOf(1, (page.height * factor).toInt())
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            bitmap.eraseColor(Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            val file = File(context.cacheDir, "sehat-page-${System.currentTimeMillis()}-$i.jpg")
            FileOutputStream(file).use { stream -> bitmap.compress(Bitmap.CompressFormat.JPEG, 92, stream) }
            bitmap.recycle()
            out.add(Uri.fromFile(file).toString())
          }
        }
      }
    }
    return out
  }

  private suspend fun recognizeText(uri: String): List<Map<String, Any>> {
    val image = InputImage.fromFilePath(context, Uri.parse(uri))
    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    try {
      val result = suspendCancellableCoroutine { continuation ->
        recognizer.process(image)
          .addOnSuccessListener { continuation.resume(it) }
          .addOnFailureListener { continuation.resumeWithException(it) }
      }
      val lines = mutableListOf<Map<String, Any>>()
      for (block in result.textBlocks) {
        for (line in block.lines) {
          val box = line.boundingBox ?: continue
          lines.add(
            mapOf(
              "text" to line.text,
              "left" to box.left,
              "top" to box.top,
              "right" to box.right,
              "bottom" to box.bottom,
            )
          )
        }
      }
      return lines
    } finally {
      recognizer.close()
    }
  }
}
