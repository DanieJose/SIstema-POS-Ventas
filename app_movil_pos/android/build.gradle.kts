allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

fun Project.ensureAndroidLibraryNamespace() {
    pluginManager.withPlugin("com.android.library") {
        val androidExtension = extensions.findByName("android") ?: return@withPlugin
        val getNamespace = androidExtension.javaClass.methods.firstOrNull { method ->
            method.name == "getNamespace" && method.parameterCount == 0
        } ?: return@withPlugin
        val currentNamespace = getNamespace.invoke(androidExtension) as? String
        if (!currentNamespace.isNullOrBlank()) return@withPlugin

        val manifestFile = projectDir.resolve("src/main/AndroidManifest.xml")
        val manifestPackage = manifestFile
            .takeIf { it.exists() }
            ?.readText()
            ?.let { Regex("""package\s*=\s*"([^"]+)"""").find(it)?.groupValues?.get(1) }

        val fallbackNamespace = "autogen.${project.name.replace(Regex("[^A-Za-z0-9_]"), "_")}"
        val namespaceToSet = manifestPackage ?: fallbackNamespace

        androidExtension.javaClass.methods.firstOrNull { method ->
            method.name == "setNamespace" && method.parameterCount == 1
        }?.invoke(androidExtension, namespaceToSet)
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
    ensureAndroidLibraryNamespace()
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
